/**
 * Orama BM25 사이트 전체 검색
 * Material for MkDocs의 lunr.js 검색을 대체
 */
(function () {
  "use strict";

  var ORAMA_CDN = "https://cdn.jsdelivr.net/npm/@orama/orama@3/+esm";

  var db = null;
  var orama = null;
  var ready = false;
  var hooked = false;

  function getSiteBase() {
    var meta = document.querySelector('meta[name="site-url"]');
    if (meta && meta.content) return meta.content.replace(/\/$/, "") + "/";
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon && canon.href) return canon.href.replace(/[^/]+$/, "");
    return "/sonblog/";
  }

  var SITE_BASE = null; // 초기화 시점에 설정

  // ── Orama 로드 + 인덱스 구축 ──
  async function initIndex() {
    try {
      SITE_BASE = getSiteBase();
      orama = await import(ORAMA_CDN);

      var resp = await fetch(SITE_BASE + "search/search_index.json");
      var data = await resp.json();

      db = await orama.create({
        schema: {
          location: "string",
          title: "string",
          text: "string",
        },
      });

      for (var i = 0; i < data.docs.length; i++) {
        var doc = data.docs[i];
        if (!doc.title && !doc.text) continue;
        await orama.insert(db, {
          location: doc.location || "",
          title: doc.title || "",
          text: doc.text || "",
        });
      }

      ready = true;
      console.log("orama-search: 인덱스 준비 완료 (" + data.docs.length + " docs)");
    } catch (err) {
      console.warn("orama-search: 초기화 실패", err);
    }
  }

  // ── 검색 실행 ──
  function performSearch(query) {
    if (!ready || !db || !query.trim()) return null;
    return orama.search(db, {
      term: query,
      limit: 30,
      boost: { title: 5, text: 1 },
    });
  }

  // ── 결과 렌더링 (Material 형식) ──
  function renderResults(results, list) {
    if (!list) return;
    var metaEl = list.closest(".md-search-result")
      ? list.closest(".md-search-result").querySelector(".md-search-result__meta")
      : null;

    if (!results || results.count === 0) {
      if (metaEl) metaEl.textContent = results ? "검색 결과 없음" : "";
      list.innerHTML = "";
      return;
    }

    // 페이지별 그룹핑 (섹션 결과를 합침)
    var grouped = new Map();
    results.hits.forEach(function (hit) {
      var doc = hit.document;
      var baseLoc = (doc.location || "").split("#")[0];
      if (!grouped.has(baseLoc)) {
        grouped.set(baseLoc, { location: baseLoc, title: "", sections: [], topScore: hit.score });
      }
      var entry = grouped.get(baseLoc);
      if (!doc.location.includes("#") && doc.title) {
        entry.title = doc.title;
      }
      entry.sections.push({
        location: doc.location,
        title: doc.title,
        text: (doc.text || "").slice(0, 200),
        score: hit.score,
      });
    });

    var pageCount = grouped.size;
    if (metaEl) metaEl.textContent = pageCount + "개 페이지에서 " + results.count + "개 결과";

    var html = "";
    grouped.forEach(function (entry, baseLoc) {
      var pageTitle = entry.title || (entry.sections[0] ? entry.sections[0].title : baseLoc) || baseLoc;
      var pageUrl = SITE_BASE + baseLoc;

      html += '<li class="md-search-result__item">';
      html += '<a href="' + escapeAttr(pageUrl) + '" class="md-search-result__link" tabindex="-1">';
      html += '<article class="md-search-result__article md-search-result__article--document">';
      html += '<div class="md-search-result__icon md-icon"></div>';
      html += '<h1 class="md-search-result__title">' + escapeHtml(pageTitle) + "</h1>";
      html += "</article></a>";

      entry.sections.forEach(function (sec) {
        if (sec.location === baseLoc && !sec.location.includes("#")) return;
        var secUrl = SITE_BASE + sec.location;
        html += '<a href="' + escapeAttr(secUrl) + '" class="md-search-result__link" tabindex="-1">';
        html += '<article class="md-search-result__article">';
        if (sec.title) html += '<h2 class="md-search-result__title">' + escapeHtml(sec.title) + "</h2>";
        if (sec.text) html += '<p class="md-search-result__teaser">' + escapeHtml(sec.text) + "</p>";
        html += "</article></a>";
      });

      html += "</li>";
    });

    list.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ── Material 검색 입력 가로채기 ──
  function hookSearch() {
    if (hooked) return;
    var searchInput = document.querySelector("[data-md-component='search-query']");
    var resultList = document.querySelector(".md-search-result__list");
    if (!searchInput || !resultList) return;

    hooked = true;
    var debounceTimer = null;

    searchInput.addEventListener("input", function (e) {
      clearTimeout(debounceTimer);
      var q = e.target.value.trim();
      if (!q) {
        resultList.innerHTML = "";
        var meta = resultList.closest(".md-search-result")
          ? resultList.closest(".md-search-result").querySelector(".md-search-result__meta")
          : null;
        if (meta) meta.textContent = "";
        return;
      }
      debounceTimer = setTimeout(function () {
        var results = performSearch(q);
        if (results) renderResults(results, resultList);
      }, 150);
    });

    // reset 버튼 처리
    var form = searchInput.closest("form");
    if (form) {
      form.addEventListener("reset", function () {
        setTimeout(function () {
          resultList.innerHTML = "";
          var meta = resultList.closest(".md-search-result")
            ? resultList.closest(".md-search-result").querySelector(".md-search-result__meta")
            : null;
          if (meta) meta.textContent = "";
        }, 10);
      });
    }
  }

  // ── 초기화 ──
  function setup() {
    initIndex();
    hookSearch();

    // instant navigation 대응 (Material의 SPA 모드)
    if (typeof document$ !== "undefined") {
      document$.subscribe(function () {
        hooked = false;
        hookSearch();
      });
    }

    // MutationObserver 폴백: 검색 모달이 나중에 DOM에 삽입될 경우
    var observer = new MutationObserver(function () {
      if (!hooked) hookSearch();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // 불필요한 감시 중단: hook 완료 후 5초 뒤
    setTimeout(function () { if (hooked) observer.disconnect(); }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
