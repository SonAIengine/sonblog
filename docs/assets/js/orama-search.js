/**
 * Orama BM25 사이트 전체 검색
 * Material for MkDocs의 lunr.js 결과를 Orama BM25 결과로 대체
 *
 * 전략: 페이지 로드 즉시 search_index.json preload + Orama CDN 로드 시작
 * Orama 준비 완료 후에는 모든 검색을 Orama가 처리하고,
 * lunr Worker가 DOM을 변경할 때마다 MutationObserver로 덮어씀
 */
(function () {
  "use strict";

  var ORAMA_CDN = "https://cdn.jsdelivr.net/npm/@orama/orama@3/+esm";

  var db = null;
  var orama = null;
  var ready = false;
  var hooked = false;
  var lastQuery = "";
  var resultObserver = null;

  function getSiteBase() {
    var meta = document.querySelector('meta[name="site-url"]');
    if (meta && meta.content) return meta.content.replace(/\/$/, "") + "/";
    return "/sonblog/";
  }

  var SITE_BASE = null;

  function stripHtml(str) {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function esc(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /** 검색어를 <mark>로 감싸서 하이라이팅 */
  function highlight(text, query) {
    if (!text || !query) return esc(text);
    var escaped = esc(text);
    var words = query.split(/\s+/).filter(Boolean);
    words.forEach(function (w) {
      var re = new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      escaped = escaped.replace(re, "<mark>$1</mark>");
    });
    return escaped;
  }

  /** 검색어 주변 컨텍스트 스니펫 추출 (앞뒤 60자) */
  function contextSnippet(text, query, maxLen) {
    if (!text || !query) return (text || "").slice(0, maxLen);
    var lower = text.toLowerCase();
    var words = query.toLowerCase().split(/\s+/).filter(Boolean);
    var bestIdx = -1;
    for (var i = 0; i < words.length; i++) {
      var idx = lower.indexOf(words[i]);
      if (idx !== -1) { bestIdx = idx; break; }
    }
    if (bestIdx === -1) return text.slice(0, maxLen);
    var start = Math.max(0, bestIdx - 60);
    var end = Math.min(text.length, start + maxLen);
    var snippet = text.slice(start, end);
    return (start > 0 ? "..." : "") + snippet + (end < text.length ? "..." : "");
  }

  // ── Orama 로드 + 인덱스 구축 (즉시 시작) ──
  var indexPromise = (async function initIndex() {
    try {
      SITE_BASE = getSiteBase();

      // 병렬로 Orama CDN + search_index.json 동시 로드
      var [oramaModule, indexResp] = await Promise.all([
        import(ORAMA_CDN),
        fetch(SITE_BASE + "search/search_index.json"),
      ]);

      orama = oramaModule;
      var data = await indexResp.json();

      db = orama.create({
        schema: {
          location: "string",
          title: "string",
          text: "string",
        },
      });

      for (var i = 0; i < data.docs.length; i++) {
        var doc = data.docs[i];
        if (!doc.title && !doc.text) continue;
        orama.insert(db, {
          location: doc.location || "",
          title: stripHtml(doc.title || ""),
          text: stripHtml(doc.text || ""),
        });
      }

      ready = true;
      console.log("orama-search: BM25 인덱스 준비 완료 (" + data.docs.length + " docs)");

      // 인덱스 준비 후 현재 검색어가 있으면 즉시 렌더
      triggerOramaRender();
    } catch (err) {
      console.warn("orama-search: 초기화 실패", err);
    }
  })();

  function performSearch(query) {
    if (!ready || !db || !query.trim()) return null;
    return orama.search(db, {
      term: query,
      limit: 30,
      boost: { title: 5, text: 1 },
    });
  }

  // ── 현재 검색어로 Orama 렌더 강제 실행 ──
  function triggerOramaRender() {
    if (!ready || !lastQuery) return;
    var resultList = document.querySelector(".md-search-result__list");
    if (!resultList) return;
    var results = performSearch(lastQuery);
    if (results) renderResults(results, resultList);
  }

  /** 태그·블로그 인덱스 등 집계 페이지 판별 */
  function isIndexPage(loc) {
    var base = (loc || "").split("#")[0];
    return /^(tags\/|blog\/|$)/.test(base);
  }

  // ── 결과 렌더링 (Material 형식 호환) ──
  function renderResults(results, list) {
    if (!list) return;
    var metaEl = list.closest(".md-search-result")
      ? list.closest(".md-search-result").querySelector(".md-search-result__meta")
      : null;

    if (!results || results.count === 0) {
      if (metaEl) metaEl.textContent = results ? "검색 결과 없음" : "";
      list.innerHTML = "";
      list.setAttribute("data-orama", "1");
      return;
    }

    // 페이지별 그룹핑
    var grouped = new Map();
    results.hits.forEach(function (hit) {
      var doc = hit.document;
      var baseLoc = (doc.location || "").split("#")[0];
      if (!grouped.has(baseLoc)) {
        grouped.set(baseLoc, { location: baseLoc, title: "", sections: [], topScore: hit.score, isIndex: isIndexPage(baseLoc) });
      }
      var entry = grouped.get(baseLoc);
      if (!doc.location.includes("#") && doc.title) {
        entry.title = doc.title;
      }
      entry.sections.push({
        location: doc.location,
        title: doc.title,
        text: doc.text || "",
        score: hit.score,
      });
    });

    // 인덱스 페이지를 뒤로 보내기
    var sorted = [];
    grouped.forEach(function (entry) { sorted.push(entry); });
    sorted.sort(function (a, b) {
      if (a.isIndex !== b.isIndex) return a.isIndex ? 1 : -1;
      return b.topScore - a.topScore;
    });

    var pageCount = sorted.length;
    if (metaEl) metaEl.textContent = pageCount + "개 페이지에서 " + results.count + "개 결과 (BM25)";

    var query = lastQuery;
    var html = "";
    sorted.forEach(function (entry) {
      var baseLoc = entry.location;
      var pageTitle = entry.title || (entry.sections[0] ? entry.sections[0].title : baseLoc) || baseLoc;
      var pageUrl = SITE_BASE + baseLoc;

      html += '<li class="md-search-result__item">';
      html += '<a href="' + esc(pageUrl) + '" class="md-search-result__link" tabindex="-1">';
      html += '<article class="md-search-result__article md-search-result__article--document">';
      html += '<div class="md-search-result__icon md-icon"></div>';
      html += '<h1 class="md-search-result__title">' + highlight(pageTitle, query) + "</h1>";
      html += "</article></a>";

      // 섹션 결과 (최대 4개)
      var secCount = 0;
      entry.sections.forEach(function (sec) {
        if (sec.location === baseLoc && !sec.location.includes("#")) return;
        if (secCount >= 4) return;
        secCount++;
        var secUrl = SITE_BASE + sec.location;
        var snippet = contextSnippet(sec.text, query, 120);
        html += '<a href="' + esc(secUrl) + '" class="md-search-result__link" tabindex="-1">';
        html += '<article class="md-search-result__article">';
        if (sec.title) html += '<h2 class="md-search-result__title">' + highlight(sec.title, query) + "</h2>";
        if (snippet) html += '<p class="md-search-result__teaser">' + highlight(snippet, query) + "</p>";
        html += "</article></a>";
      });

      html += "</li>";
    });

    list.innerHTML = html;
    list.setAttribute("data-orama", "1");
  }

  // ── Material 검색 가로채기 ──
  function hookSearch() {
    if (hooked) return;
    var searchInput = document.querySelector("[data-md-component='search-query']");
    var resultList = document.querySelector(".md-search-result__list");
    if (!searchInput || !resultList) return;

    hooked = true;

    // 입력 이벤트
    searchInput.addEventListener("input", function (e) {
      lastQuery = e.target.value.trim();
      if (!lastQuery) {
        resultList.removeAttribute("data-orama");
        return;
      }
      // Orama 준비됐으면 즉시 렌더 (lunr보다 빠르게)
      if (ready) {
        var results = performSearch(lastQuery);
        if (results) renderResults(results, resultList);
      }
    });

    // MutationObserver: lunr Worker가 결과를 쓸 때마다 Orama로 덮어씀
    if (resultObserver) resultObserver.disconnect();
    resultObserver = new MutationObserver(function () {
      if (!lastQuery || !ready) return;
      // Orama가 방금 렌더한 것이면 무시
      if (resultList.getAttribute("data-orama") === "1") {
        resultList.removeAttribute("data-orama");
        return;
      }
      // lunr이 결과를 쓴 것 → Orama로 덮어쓰기
      var results = performSearch(lastQuery);
      if (results) renderResults(results, resultList);
    });
    resultObserver.observe(resultList, { childList: true });

    // reset 버튼
    var form = searchInput.closest("form");
    if (form) {
      form.addEventListener("reset", function () {
        lastQuery = "";
        resultList.removeAttribute("data-orama");
      });
    }

    // 검색 모달이 열릴 때 — Orama로 기존 검색어 재렌더
    var searchToggle = document.getElementById("__search");
    if (searchToggle) {
      searchToggle.addEventListener("change", function () {
        if (searchToggle.checked && lastQuery && ready) {
          setTimeout(triggerOramaRender, 50);
        }
      });
    }
  }

  // ── 초기화 ──
  function setup() {
    hookSearch();

    // DOM 변경 감지
    var domObserver = new MutationObserver(function () {
      if (!hooked) hookSearch();
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { if (hooked) domObserver.disconnect(); }, 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
