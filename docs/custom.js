document.addEventListener("DOMContentLoaded", function () {
  var title = document.querySelector(".md-header__topic .md-ellipsis");
  if (title) {
    title.style.cursor = "pointer";
    title.addEventListener("click", function () {
      window.location.href = "/";
    });
  }

  // 사이드바 카테고리 클릭 시 페이지 이동 대신 토글만 수행
  document.querySelectorAll(".md-sidebar--primary .md-nav__container").forEach(function (container) {
    var link = container.querySelector("a.md-nav__link");
    var toggle = container.querySelector("label.md-nav__link");
    if (link && toggle) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        toggle.click();
      });
    }
  });
});

// ── GoatCounter: SPA 대응 + 방문자 수 표시 ──────────────────────────────────
(function () {
  var GC_ENDPOINT = "https://sonblog.goatcounter.com";

  // SPA instant navigation 대응: 페이지 이동마다 수동 count
  function gcCount() {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: location.pathname });
    }
  }

  // 페이지별 조회수 표시 (글 상단 h1 아래)
  function showPageViews() {
    var h1 = document.querySelector(".md-content__inner h1");
    if (!h1) return;
    // 이미 삽입된 경우 제거 후 다시 삽입
    var existing = h1.parentElement.querySelector(".gc-page-views");
    if (existing) existing.remove();

    var p = location.pathname.replace(/\/$/, "") || "/";
    var apiPath = encodeURIComponent(p);
    var url = GC_ENDPOINT + "/counter/" + apiPath + ".json";

    fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.count) return;
        var div = document.createElement("div");
        div.className = "gc-page-views";
        div.textContent = data.count + " views";
        h1.insertAdjacentElement("afterend", div);
      })
      .catch(function () {});
  }

  // 전체 방문자 수 표시 (HOME hero + 푸터)
  function showTotalViews() {
    fetch(GC_ENDPOINT + "/counter/TOTAL.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.count) return;

        // HOME hero 영역
        var heroTotal = document.querySelector(".gc-home-total");
        if (heroTotal) {
          heroTotal.textContent = " · " + data.count + " views";
        }

        // 푸터
        var footer = document.querySelector(".md-footer-meta__inner");
        if (footer) {
          var existing = footer.querySelector(".gc-total-counter");
          if (existing) existing.remove();
          var span = document.createElement("span");
          span.className = "gc-total-counter";
          span.textContent = "Total " + data.count + " views";
          footer.appendChild(span);
        }
      })
      .catch(function () {});
  }

  function onNavigate() {
    gcCount();
    showPageViews();
    showTotalViews();
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(onNavigate);
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onNavigate);
    } else {
      onNavigate();
    }
  }
})();

// ── Knowledge Graph: instant navigation 대응 ──────────────────────────────────
// MkDocs Material의 document$ observable은 instant navigation 때마다 emit한다.
// graph 페이지에서만 번들을 로드하고 initGraphViz()를 호출한다.
(function () {
  var GRAPH_PATH = "/graph/";
  var bundleLoaded = false;

  function maybeInitGraph() {
    if (window.location.pathname !== GRAPH_PATH) return;
    if (!document.getElementById("sigma-container")) return;

    if (window.initGraphViz) {
      window.initGraphViz();
    } else if (!bundleLoaded) {
      bundleLoaded = true;
      var s = document.createElement("script");
      s.src = "/assets/graph/graph-viz.iife.js";
      document.body.appendChild(s);
      // IIFE 자체가 init()를 실행하므로 onload 불필요
    }
  }

  // instant navigation: document$ 구독
  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(maybeInitGraph);
  } else {
    // 첫 직접 접근
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", maybeInitGraph);
    } else {
      maybeInitGraph();
    }
  }
})();
