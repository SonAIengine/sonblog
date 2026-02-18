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
  var activeResultIdx = -1;

  // 카테고리 폴더 → 표시명 매핑
  var CATEGORY_NAMES = {
    "search-engine": "Search Engine",
    "ai": "AI/ML & LLM",
    "devops": "DevOps",
    "full-stack": "Full Stack",
    "blog": "Blog",
  };

  function getSiteBase() {
    var meta = document.querySelector('meta[name="site-url"]');
    if (meta && meta.content) return meta.content.replace(/\/$/, "") + "/";
    return "/";
  }

  var SITE_BASE = null;

  /** HTML 태그 + 마크다운 기호 + 코드 잔여물 정제 */
  function stripHtml(str) {
    if (!str) return "";
    return str
      .replace(/<pre[\s\S]*?<\/pre>/gi, " ")   // 코드 블록 전체 제거
      .replace(/<code[\s\S]*?<\/code>/gi, " ")  // 인라인 코드 제거
      .replace(/<[^>]*>/g, " ")                  // 나머지 HTML 태그
      .replace(/```[\s\S]*?```/g, " ")           // 마크다운 코드 펜스
      .replace(/`[^`]+`/g, " ")                  // 마크다운 인라인 코드
      .replace(/^#{1,6}\s+/gm, "")               // 마크다운 헤더 기호
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")  // bold/italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // 마크다운 링크
      .replace(/[*_~|]/g, "")                    // 나머지 마크다운 기호
      .replace(/\s+/g, " ")
      .trim();
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

  /** 검색어 매치 밀도가 가장 높은 구간을 찾아서 스니펫 추출 */
  function contextSnippet(text, query, maxLen) {
    if (!text) return "";
    if (!query) return text.slice(0, maxLen);
    var lower = text.toLowerCase();
    var words = query.toLowerCase().split(/\s+/).filter(Boolean);

    // 모든 매치 위치 수집
    var positions = [];
    words.forEach(function (w) {
      var idx = 0;
      while (idx < lower.length) {
        var found = lower.indexOf(w, idx);
        if (found === -1) break;
        positions.push(found);
        idx = found + w.length;
      }
    });

    if (positions.length === 0) return text.slice(0, maxLen);
    positions.sort(function (a, b) { return a - b; });

    // 슬라이딩 윈도우로 매치 밀도가 가장 높은 구간 찾기
    var bestStart = positions[0];
    var bestCount = 0;
    for (var i = 0; i < positions.length; i++) {
      var winStart = positions[i];
      var winEnd = winStart + maxLen;
      var count = 0;
      for (var j = i; j < positions.length && positions[j] < winEnd; j++) {
        count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestStart = winStart;
      }
    }

    var start = Math.max(0, bestStart - 30);
    var end = Math.min(text.length, start + maxLen);
    // 단어 경계에서 자르기
    if (start > 0) {
      var spaceIdx = text.indexOf(" ", start);
      if (spaceIdx !== -1 && spaceIdx < start + 15) start = spaceIdx + 1;
    }
    if (end < text.length) {
      var spaceIdx2 = text.lastIndexOf(" ", end);
      if (spaceIdx2 > end - 15) end = spaceIdx2;
    }

    var snippet = text.slice(start, end);
    return (start > 0 ? "..." : "") + snippet + (end < text.length ? "..." : "");
  }

  /** URL 경로에서 카테고리 > 서브카테고리 빵크럼 추출 */
  function getBreadcrumb(location) {
    if (!location) return "";
    var base = location.split("#")[0];
    var parts = base.split("/").filter(Boolean);
    if (parts.length === 0) return "";

    var top = CATEGORY_NAMES[parts[0]];
    if (!top) return "";

    if (parts.length <= 2) return top;

    try { var sub = decodeURIComponent(parts[1]); }
    catch (e) { var sub = parts[1]; }
    return top + " \u203A " + sub;
  }

  // ── Orama 로드 + 인덱스 구축 (즉시 시작) ──
  var indexPromise = (async function initIndex() {
    try {
      SITE_BASE = getSiteBase();

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
      triggerOramaRender();
    } catch (err) {
      console.warn("orama-search: 초기화 실패", err);
    }
  })();

  function performSearch(query) {
    if (!ready || !db || !query.trim()) return null;
    var t0 = performance.now();
    var result = orama.search(db, {
      term: query,
      limit: 30,
      boost: { title: 5, text: 1 },
    });
    result._elapsed = Math.round(performance.now() - t0);
    return result;
  }

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

  // ── 결과 렌더링 ──
  function renderResults(results, list) {
    if (!list) return;
    activeResultIdx = -1;
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
        grouped.set(baseLoc, {
          location: baseLoc, title: "", pageText: "",
          sections: [], topScore: hit.score,
          isIndex: isIndexPage(baseLoc),
        });
      }
      var entry = grouped.get(baseLoc);
      if (!doc.location.includes("#") && doc.title) {
        entry.title = doc.title;
        if (doc.text) entry.pageText = doc.text;
      }
      entry.sections.push({
        location: doc.location,
        title: doc.title,
        text: doc.text || "",
        score: hit.score,
      });
    });

    // 인덱스 페이지 후순위 정렬
    var sorted = [];
    grouped.forEach(function (entry) { sorted.push(entry); });
    sorted.sort(function (a, b) {
      if (a.isIndex !== b.isIndex) return a.isIndex ? 1 : -1;
      return b.topScore - a.topScore;
    });

    var pageCount = sorted.length;
    var elapsed = results._elapsed || 0;
    if (metaEl) {
      metaEl.textContent = pageCount + "개 페이지에서 " + results.count + "개 결과 (BM25, " + elapsed + "ms)";
    }

    var query = lastQuery;
    var html = "";
    sorted.forEach(function (entry) {
      var baseLoc = entry.location;
      var pageTitle = entry.title || (entry.sections[0] ? entry.sections[0].title : baseLoc) || baseLoc;
      var pageUrl = SITE_BASE + baseLoc;
      var breadcrumb = getBreadcrumb(baseLoc);

      // 섹션 필터링 (페이지 레벨/중복 제외)
      var pageTitleLower = pageTitle.toLowerCase();
      var filteredSections = entry.sections
        .filter(function (sec) {
          if (sec.location === baseLoc && !sec.location.includes("#")) return false;
          if (sec.title && sec.title.toLowerCase() === pageTitleLower) return false;
          return true;
        })
        .sort(function (a, b) { return b.score - a.score; });

      var sectionCount = filteredSections.length;

      // 페이지 레벨 teaser: pageText 또는 첫 섹션 텍스트
      var pageTeaserSrc = entry.pageText;
      if (!pageTeaserSrc) {
        for (var i = 0; i < entry.sections.length; i++) {
          if (entry.sections[i].text) { pageTeaserSrc = entry.sections[i].text; break; }
        }
      }
      var pageTeaser = pageTeaserSrc ? contextSnippet(pageTeaserSrc, query, 160) : "";

      html += '<li class="md-search-result__item">';
      html += '<a href="' + esc(pageUrl) + '" class="md-search-result__link" tabindex="-1">';
      html += '<article class="md-search-result__article md-search-result__article--document">';

      // 빵크럼 경로
      if (breadcrumb) {
        html += '<nav class="md-search-result__breadcrumb">' + esc(breadcrumb);
        if (sectionCount > 0) {
          html += '<span class="md-search-result__match-count">' + sectionCount + '개 섹션</span>';
        }
        html += '</nav>';
      }

      html += '<h1 class="md-search-result__title">' + highlight(pageTitle, query) + "</h1>";
      if (pageTeaser) {
        html += '<p class="md-search-result__teaser">' + highlight(pageTeaser, query) + "</p>";
      }
      html += "</article></a>";

      // 섹션 결과 — 컴팩트 링크 리스트 (최대 4개)
      if (filteredSections.length > 0) {
        var maxSec = Math.min(filteredSections.length, 4);
        html += '<div class="md-search-result__sections">';
        for (var si = 0; si < maxSec; si++) {
          var sec = filteredSections[si];
          if (!sec.title) continue;
          var secUrl = SITE_BASE + sec.location;
          html += '<a href="' + esc(secUrl) + '" class="md-search-result__section-link" tabindex="-1">';
          html += '<span class="md-search-result__section-hash">#</span>';
          html += highlight(sec.title, query);
          html += '</a>';
        }
        if (filteredSections.length > maxSec) {
          html += '<span class="md-search-result__section-more">+' + (filteredSections.length - maxSec) + '개 더</span>';
        }
        html += '</div>';
      }

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

    searchInput.addEventListener("input", function (e) {
      lastQuery = e.target.value.trim();
      activeResultIdx = -1;
      if (!lastQuery) {
        resultList.removeAttribute("data-orama");
        return;
      }
      if (ready) {
        var results = performSearch(lastQuery);
        if (results) renderResults(results, resultList);
      }
    });

    // 키보드 네비게이션 (화살표 위/아래, Enter)
    searchInput.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
      var links = resultList.querySelectorAll(".md-search-result__link, .md-search-result__section-link");
      if (links.length === 0) return;

      if (e.key === "Enter" && activeResultIdx >= 0 && activeResultIdx < links.length) {
        e.preventDefault();
        e.stopPropagation();
        links[activeResultIdx].click();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        activeResultIdx = Math.min(activeResultIdx + 1, links.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        activeResultIdx = Math.max(activeResultIdx - 1, -1);
      }

      links.forEach(function (l, i) {
        var cls = l.classList.contains("md-search-result__section-link")
          ? "md-search-result__section-link--active"
          : "md-search-result__link--active";
        l.classList.remove("md-search-result__link--active", "md-search-result__section-link--active");
        if (i === activeResultIdx) l.classList.add(cls);
      });

      if (activeResultIdx >= 0 && links[activeResultIdx]) {
        links[activeResultIdx].scrollIntoView({ block: "nearest" });
      }
    });

    if (resultObserver) resultObserver.disconnect();
    resultObserver = new MutationObserver(function () {
      if (!lastQuery || !ready) return;
      if (resultList.getAttribute("data-orama") === "1") {
        resultList.removeAttribute("data-orama");
        return;
      }
      var results = performSearch(lastQuery);
      if (results) renderResults(results, resultList);
    });
    resultObserver.observe(resultList, { childList: true });

    var form = searchInput.closest("form");
    if (form) {
      form.addEventListener("reset", function () {
        lastQuery = "";
        resultList.removeAttribute("data-orama");
      });
    }

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
