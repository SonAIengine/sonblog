/**
 * Orama BM25 사이트 전체 검색
 * Material for MkDocs의 lunr.js 결과를 Orama BM25 결과로 대체
 * 방식: Material의 검색 UI는 그대로 유지, input 이벤트를 감지하여
 * Orama 결과를 렌더링하고 lunr 결과가 나오면 즉시 덮어씀
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

  // ── Orama 로드 + 인덱스 구축 ──
  async function initIndex() {
    try {
      SITE_BASE = getSiteBase();
      orama = await import(ORAMA_CDN);

      var resp = await fetch(SITE_BASE + "search/search_index.json");
      var data = await resp.json();

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
          title: doc.title || "",
          text: doc.text || "",
        });
      }

      ready = true;
      console.log("orama-search: 인덱스 준비 완료 (" + data.docs.length + " docs)");

      // 인덱스 준비 완료 후 현재 검색어가 있으면 즉시 렌더
      if (lastQuery) {
        var resultList = document.querySelector(".md-search-result__list");
        if (resultList) {
          var results = performSearch(lastQuery);
          if (results) renderResults(results, resultList);
        }
      }
    } catch (err) {
      console.warn("orama-search: 초기화 실패", err);
    }
  }

  function performSearch(query) {
    if (!ready || !db || !query.trim()) return null;
    return orama.search(db, {
      term: query,
      limit: 30,
      boost: { title: 5, text: 1 },
    });
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
      return;
    }

    // 페이지별 그룹핑
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
    if (metaEl) metaEl.textContent = pageCount + "개 페이지에서 " + results.count + "개 결과 (BM25)";

    var html = "";
    grouped.forEach(function (entry, baseLoc) {
      var pageTitle = entry.title || (entry.sections[0] ? entry.sections[0].title : baseLoc) || baseLoc;
      var pageUrl = SITE_BASE + baseLoc;

      html += '<li class="md-search-result__item">';
      html += '<a href="' + esc(pageUrl) + '" class="md-search-result__link" tabindex="-1">';
      html += '<article class="md-search-result__article md-search-result__article--document">';
      html += '<div class="md-search-result__icon md-icon"></div>';
      html += '<h1 class="md-search-result__title">' + esc(pageTitle) + "</h1>";
      html += "</article></a>";

      entry.sections.forEach(function (sec) {
        if (sec.location === baseLoc && !sec.location.includes("#")) return;
        var secUrl = SITE_BASE + sec.location;
        html += '<a href="' + esc(secUrl) + '" class="md-search-result__link" tabindex="-1">';
        html += '<article class="md-search-result__article">';
        if (sec.title) html += '<h2 class="md-search-result__title">' + esc(sec.title) + "</h2>";
        if (sec.text) html += '<p class="md-search-result__teaser">' + esc(sec.text) + "</p>";
        html += "</article></a>";
      });

      html += "</li>";
    });

    list.innerHTML = html;
    list.setAttribute("data-orama-rendered", "true");
  }

  function esc(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ── Material 검색 가로채기 ──
  function hookSearch() {
    if (hooked) return;
    var searchInput = document.querySelector("[data-md-component='search-query']");
    var resultList = document.querySelector(".md-search-result__list");
    if (!searchInput || !resultList) return;

    hooked = true;
    var debounceTimer = null;

    // 입력 이벤트 — Orama 검색 실행
    searchInput.addEventListener("input", function (e) {
      clearTimeout(debounceTimer);
      lastQuery = e.target.value.trim();
      if (!lastQuery) {
        resultList.removeAttribute("data-orama-rendered");
        return; // Material이 알아서 초기화
      }
      debounceTimer = setTimeout(function () {
        var results = performSearch(lastQuery);
        if (results) renderResults(results, resultList);
      }, 100); // lunr보다 빠르게
    });

    // MutationObserver: lunr Worker가 결과를 쓸 때마다 Orama로 덮어씀
    if (resultObserver) resultObserver.disconnect();
    resultObserver = new MutationObserver(function () {
      if (!lastQuery || !ready) return;
      // Orama가 이미 렌더한 결과면 무시
      if (resultList.getAttribute("data-orama-rendered") === "true") {
        resultList.removeAttribute("data-orama-rendered");
        return;
      }
      // lunr이 결과를 쓴 것이므로 Orama로 덮어씀
      var results = performSearch(lastQuery);
      if (results) renderResults(results, resultList);
    });
    resultObserver.observe(resultList, { childList: true });

    // reset 버튼
    var form = searchInput.closest("form");
    if (form) {
      form.addEventListener("reset", function () {
        lastQuery = "";
        resultList.removeAttribute("data-orama-rendered");
      });
    }
  }

  // ── 초기화 ──
  function setup() {
    initIndex();
    hookSearch();

    // DOM 변경 감지로 검색 UI가 나중에 삽입될 경우 대응
    var domObserver = new MutationObserver(function () {
      if (!hooked) hookSearch();
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { if (hooked) domObserver.disconnect(); }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
