document.addEventListener("DOMContentLoaded", function () {
  var title = document.querySelector(".md-header__topic .md-ellipsis");
  if (title) {
    title.style.cursor = "pointer";
    title.addEventListener("click", function () {
      window.location.href = "/sonblog/";
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

// ── Knowledge Graph: instant navigation 대응 ──────────────────────────────────
// MkDocs Material의 document$ observable은 instant navigation 때마다 emit한다.
// graph 페이지에서만 번들을 로드하고 initGraphViz()를 호출한다.
(function () {
  var GRAPH_PATH = "/sonblog/graph/";
  var bundleLoaded = false;

  function maybeInitGraph() {
    if (window.location.pathname !== GRAPH_PATH) return;
    if (!document.getElementById("sigma-container")) return;

    if (window.initGraphViz) {
      window.initGraphViz();
    } else if (!bundleLoaded) {
      bundleLoaded = true;
      var s = document.createElement("script");
      s.src = "/sonblog/assets/graph/graph-viz.iife.js";
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
