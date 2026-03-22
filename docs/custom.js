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

  // 페이지별 조회수 표시 (글 상단 h1 아래, HOME 제외)
  function showPageViews() {
    if (location.pathname === "/") return;
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

// ── Home: 타이핑 애니메이션 + Spotlight + Scroll Reveal ────────────────────────
(function () {
  var typingTimer = null;

  function heroTyping() {
    var el = document.getElementById("hero-typing");
    if (!el) return;

    var words = ["LLM Serving", "Rust Search Engine", "K8s Infra", "RAG Pipeline", "MCP Agent", "Embedding Optimization"];
    var wordIdx = 0, charIdx = 0, deleting = false;

    // 이전 타이머 정리
    if (typingTimer) clearInterval(typingTimer);

    typingTimer = setInterval(function () {
      var word = words[wordIdx];
      if (!deleting) {
        el.textContent = word.substring(0, charIdx + 1);
        charIdx++;
        if (charIdx >= word.length) {
          deleting = true;
          // 완성 후 대기
          clearInterval(typingTimer);
          typingTimer = setTimeout(function () {
            typingTimer = setInterval(arguments.callee.caller || deleteLoop, 40);
          }, 2000);
          return;
        }
      }
    }, 80);

    // 삭제 루프를 별도로 관리
    function startTypingLoop() {
      if (typingTimer) { clearInterval(typingTimer); clearTimeout(typingTimer); }

      var phase = "typing"; // typing | waiting | deleting
      charIdx = 0;
      deleting = false;

      function tick() {
        var word = words[wordIdx];
        if (phase === "typing") {
          el.textContent = word.substring(0, charIdx + 1);
          charIdx++;
          if (charIdx >= word.length) {
            phase = "waiting";
            setTimeout(tick, 2000);
            return;
          }
          setTimeout(tick, 80);
        } else if (phase === "waiting") {
          phase = "deleting";
          setTimeout(tick, 40);
        } else if (phase === "deleting") {
          charIdx--;
          el.textContent = word.substring(0, charIdx);
          if (charIdx <= 0) {
            wordIdx = (wordIdx + 1) % words.length;
            phase = "typing";
            setTimeout(tick, 300);
            return;
          }
          setTimeout(tick, 40);
        }
      }
      tick();
    }

    // 깔끔하게 재시작
    if (typingTimer) { clearInterval(typingTimer); clearTimeout(typingTimer); }
    startTypingLoop();
  }

  function initSpotlight() {
    document.querySelectorAll("[data-spotlight]").forEach(function (card) {
      if (card._spotlightBound) return;
      card._spotlightBound = true;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  function initScrollReveal() {
    var elements = document.querySelectorAll(".reveal:not(.revealed)");
    if (!elements.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    elements.forEach(function (el) { observer.observe(el); });
  }

  function onHomeNavigate() {
    initSpotlight();
    if (location.pathname === "/") {
      heroTyping();
      // 카드에 reveal 적용
      document.querySelectorAll(".home-card").forEach(function (c) { c.classList.add("reveal"); });
      initScrollReveal();
    }
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(onHomeNavigate);
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onHomeNavigate);
    } else {
      onHomeNavigate();
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
