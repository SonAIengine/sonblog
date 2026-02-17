import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

let currentRenderer = null;
let starfieldAnimId  = null;

// ── 별 파티클 배경 ────────────────────────────────────────────────────────────

function startStarfield(container) {
  // 기존 캔버스 제거
  const old = container.querySelector(".starfield-canvas");
  if (old) old.remove();
  if (starfieldAnimId) { cancelAnimationFrame(starfieldAnimId); starfieldAnimId = null; }

  const canvas = document.createElement("canvas");
  canvas.className = "starfield-canvas";
  canvas.style.cssText = `
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 0;
  `;
  container.style.position = "relative";
  container.prepend(canvas);

  function resize() {
    canvas.width  = container.offsetWidth  || 800;
    canvas.height = container.offsetHeight || 600;
  }
  resize();

  const ctx = canvas.getContext("2d");

  const STAR_COUNT = 180;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    r:  Math.random() * 1.4 + 0.2,
    alpha: Math.random() * 0.6 + 0.2,
    dAlpha: (Math.random() * 0.006 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.alpha += s.dAlpha;
      if (s.alpha > 0.85 || s.alpha < 0.1) s.dAlpha *= -1;
      // 코어
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 200, 255, ${s.alpha})`;
      ctx.fill();
      // 헤일로
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, `rgba(180, 200, 255, ${s.alpha * 0.35})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });
    starfieldAnimId = requestAnimationFrame(draw);
  }

  draw();

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  canvas._ro = ro;
}

function stopStarfield(container) {
  if (starfieldAnimId) { cancelAnimationFrame(starfieldAnimId); starfieldAnimId = null; }
  const c = container?.querySelector(".starfield-canvas");
  if (c) { c._ro?.disconnect(); c.remove(); }
}

// ── 초기화 ────────────────────────────────────────────────────────────────────

function init() {
  const container = document.getElementById("sigma-container");
  if (!container) return;

  const rawData = window.__GRAPH_DATA__;
  if (!rawData) { console.error("graph-viz: __GRAPH_DATA__ not found"); return; }

  if (currentRenderer) {
    try { currentRenderer.kill(); } catch (_) {}
    currentRenderer = null;
  }
  stopStarfield(container);
  container.innerHTML = "";

  // ── 코스믹 색상 팔레트 ──────────────────────────────────────────────────────

  const NODE_COLORS = {
    category:    "#a78bfa",   // 라벤더 바이올렛
    subcategory: "#60a5fa",   // 스카이 블루
    series:      "#fb923c",   // 오렌지
    tag:         "#34d399",   // 에메랄드
    post:        "#f472b6",   // 핑크
  };

  // 글로우 색 (밝은 버전)
  const GLOW_COLORS = {
    category:    "rgba(167,139,250,",
    subcategory: "rgba(96,165,250,",
    series:      "rgba(251,146,60,",
    tag:         "rgba(52,211,153,",
    post:        "rgba(244,114,182,",
  };

  const EDGE_COLORS = {
    inCategory:    "rgba(167,139,250,0.25)",
    inSubcategory: "rgba(96,165,250,0.25)",
    inSeries:      "rgba(251,146,60,0.35)",
    hasTag:        "rgba(52,211,153,0.2)",
    related:       "rgba(192,132,252,0.4)",
    dependsOn:     "rgba(96,165,250,0.45)",
    tagCooccurs:   "rgba(253,224,71,0.2)",
  };

  const NODE_HIDDEN_BY_TYPE = {
    category: false, subcategory: false,
    series: false, tag: false, post: true,
  };

  const activeFilters = {
    category: true, subcategory: true,
    series: true, tag: true, post: false,
  };

  const graphState = {
    hoveredNode: null, selectedNode: null,
    searchQuery: "", searchMatches: new Set(),
  };

  // ── 연결 수 사전 계산 ───────────────────────────────────────────────────────

  const degreeMap = {};
  rawData.nodes.forEach(n => { degreeMap[n.id] = 0; });
  rawData.edges.forEach(e => {
    if (degreeMap[e.source] !== undefined) degreeMap[e.source]++;
    if (degreeMap[e.target] !== undefined) degreeMap[e.target]++;
  });

  function computeNodeSize(node) {
    const deg = degreeMap[node.id] || 0;
    switch (node.type) {
      case "category":    return 30;
      case "subcategory": return 18 + Math.min(deg * 0.3, 8);
      case "series":      return 16 + Math.min(deg * 0.5, 10);
      case "tag":         return Math.max(9, Math.min(28, 8 + deg * 1.2));
      case "post":        return Math.max(7, Math.min(22, 6 + deg * 1.8));
      default:            return 10;
    }
  }

  // ── 그래프 구성 ──────────────────────────────────────────────────────────────

  const graph = new Graph({ multi: false, type: "directed" });

  rawData.nodes.forEach(node => {
    graph.addNode(node.id, {
      label:      node.label,
      size:       computeNodeSize(node),
      color:      NODE_COLORS[node.type] || "#a78bfa",
      nodeType:   node.type,
      url:        node.url        || null,
      date:       node.date       || null,
      series:     node.series     || null,
      difficulty: node.difficulty || null,
      hidden:     NODE_HIDDEN_BY_TYPE[node.type] ?? false,
      x: Math.random() * 100,
      y: Math.random() * 100,
    });
  });

  const edgeSet = new Set();
  rawData.edges.forEach(edge => {
    const key    = `${edge.source}--${edge.target}`;
    const revKey = `${edge.target}--${edge.source}`;
    if (
      edgeSet.has(key) || edgeSet.has(revKey) ||
      !graph.hasNode(edge.source) || !graph.hasNode(edge.target) ||
      edge.source === edge.target
    ) return;
    edgeSet.add(key);

    const isDirected = edge.type === "dependsOn" || edge.type === "related";
    graph.addDirectedEdge(edge.source, edge.target, {
      edgeType: edge.type,
      weight:   edge.weight,
      color:    EDGE_COLORS[edge.type] || "rgba(148,163,184,0.2)",
      size:     edge.type === "tagCooccurs" ? Math.min(edge.weight * 0.6, 2.5) : 0.9,
      type:     isDirected ? "arrow" : "line",
    });
  });

  // ── 초기 배치: 타입별 섹터 분리 ─────────────────────────────────────────────
  // category 노드를 중심 근처에, 나머지는 각 카테고리 기준 섹터로 배치
  // 목적: ForceAtlas2가 좋은 시작점에서 클러스터를 분리할 수 있도록

  const TYPE_RADIUS = {
    category:    80,   // 중심 근처
    subcategory: 220,  // category 주변
    series:      280,  // series는 subcategory 바깥
    tag:         360,  // tag는 가장 바깥
    post:        300,  // post는 series/tag 사이
  };

  // category 노드를 먼저 균등 배치 (상하좌우)
  const catNodes    = graph.nodes().filter(n => graph.getNodeAttribute(n, "nodeType") === "category");
  const catAngleMap = {};
  catNodes.forEach((n, i) => {
    const angle = (i / Math.max(catNodes.length, 1)) * 2 * Math.PI;
    catAngleMap[n] = angle;
    graph.setNodeAttribute(n, "x", TYPE_RADIUS.category * Math.cos(angle));
    graph.setNodeAttribute(n, "y", TYPE_RADIUS.category * Math.sin(angle));
  });

  // 각 노드의 소속 카테고리를 역추적하여 섹터 각도 결정
  // post → subcat → cat 엣지를 역방향으로 탐색
  const nodeCatAngle = {};

  // subcategory 배치: cat과 연결된 subcat 찾기
  graph.nodes().filter(n => graph.getNodeAttribute(n, "nodeType") === "subcategory").forEach(n => {
    // inCategory 엣지로 연결된 cat 찾기
    const neighbors = graph.neighbors(n);
    const parentCat = neighbors.find(nb => graph.getNodeAttribute(nb, "nodeType") === "category");
    const baseAngle = parentCat ? (catAngleMap[parentCat] || 0) : Math.random() * 2 * Math.PI;
    const jitter = (Math.random() - 0.5) * (Math.PI / catNodes.length);
    nodeCatAngle[n] = baseAngle + jitter;
    graph.setNodeAttribute(n, "x", TYPE_RADIUS.subcategory * Math.cos(baseAngle + jitter));
    graph.setNodeAttribute(n, "y", TYPE_RADIUS.subcategory * Math.sin(baseAngle + jitter));
  });

  // series/tag/post: 연결된 subcategory 또는 category 기준으로 섹터 결정
  graph.nodes()
    .filter(n => ["series", "tag", "post"].includes(graph.getNodeAttribute(n, "nodeType")))
    .forEach(n => {
      const nodeType = graph.getNodeAttribute(n, "nodeType");
      const neighbors = graph.neighbors(n);
      // 우선순위: subcategory > category
      const parentSubcat = neighbors.find(nb => graph.getNodeAttribute(nb, "nodeType") === "subcategory");
      const parentCat    = neighbors.find(nb => graph.getNodeAttribute(nb, "nodeType") === "category");
      let baseAngle;
      if (parentSubcat && nodeCatAngle[parentSubcat] !== undefined) {
        baseAngle = nodeCatAngle[parentSubcat];
      } else if (parentCat && catAngleMap[parentCat] !== undefined) {
        baseAngle = catAngleMap[parentCat];
      } else {
        baseAngle = Math.random() * 2 * Math.PI;
      }
      const jitter = (Math.random() - 0.5) * (Math.PI * 0.6);
      const r = TYPE_RADIUS[nodeType] || 300;
      graph.setNodeAttribute(n, "x", r * Math.cos(baseAngle + jitter) + (Math.random() - 0.5) * 30);
      graph.setNodeAttribute(n, "y", r * Math.sin(baseAngle + jitter) + (Math.random() - 0.5) * 30);
    });

  forceAtlas2.assign(graph, {
    iterations: 600,
    settings: {
      gravity:           0.3,   // 낮춰야 중심 집중 방지
      scalingRatio:      55,    // 높일수록 노드가 더 넓게 퍼짐
      barnesHutOptimize: true,
      barnesHutTheta:    0.5,
      strongGravityMode: false,
      linLogMode:        true,  // 허브 노드 과도한 크기 억제 (클러스터 분리에 유리)
      adjustSizes:       true,
      slowDown:          8,     // 안정화 속도 (높을수록 천천히 수렴)
      outboundAttractionDistribution: false,
    },
  });

  // ── 별 파티클 시작 ──────────────────────────────────────────────────────────

  startStarfield(container);

  // ── Sigma 렌더러 ─────────────────────────────────────────────────────────────

  // 커스텀 노드 그리기 (글로우 효과)
  function drawNode(ctx, x, y, size, color, glowColor, alpha = 1) {
    // 외부 헤일로
    const halo = ctx.createRadialGradient(x, y, size * 0.4, x, y, size * 3.5);
    halo.addColorStop(0, glowColor + "0.3)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(x, y, size * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.globalAlpha = alpha;
    ctx.fill();

    // 코어
    const core = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    core.addColorStop(0, "#ffffff");
    core.addColorStop(0.3, color);
    core.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.globalAlpha = alpha;
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  const renderer = new Sigma(graph, container, {
    renderEdgeLabels:       false,
    enableEdgeClickEvents:  false,
    enableEdgeWheelEvents:  false,
    enableEdgeHoverEvents:  false,
    defaultNodeColor:       "#a78bfa",
    defaultEdgeColor:       "rgba(148,163,184,0.2)",
    labelFont:              "Pretendard, sans-serif",
    labelSize:              12,
    labelWeight:            "600",
    labelColor:             { color: "#e2e8f0" },
    labelBackgroundColor:   "rgba(10,10,26,0.55)",
    labelRenderedSizeThreshold: 7,
    minCameraRatio:         0.03,
    maxCameraRatio:         8,
    defaultEdgeType:        "line",
    defaultArrowHeadLength: 6,
    // sigma.js v3 canvas hooks
    afterRender:            null,

    nodeReducer: (node, data) => {
      const res = { ...data };
      const isSelected = graphState.selectedNode === node;
      const isHovered  = graphState.hoveredNode  === node;
      const neighbors  = graphState.hoveredNode
        ? new Set(graph.neighbors(graphState.hoveredNode))
        : (graphState.selectedNode ? new Set(graph.neighbors(graphState.selectedNode)) : null);

      // 검색 필터
      if (graphState.searchQuery && graphState.searchMatches.size > 0) {
        if (!graphState.searchMatches.has(node)) {
          res.color = "rgba(148,163,184,0.15)";
          res.label = "";
          res.size  = data.size * 0.4;
          return res;
        }
        res.size = data.size * 1.3;
      }

      // hover/select 페이드
      if ((graphState.hoveredNode || graphState.selectedNode) && !isHovered && !isSelected) {
        if (!neighbors || !neighbors.has(node)) {
          res.color = "rgba(148,163,184,0.12)";
          res.label = "";
          res.size  = data.size * 0.5;
          return res;
        }
        res.size = data.size * 1.1;
      }

      if (isSelected) {
        res.size   = data.size * 1.6;
        res.zIndex = 10;
      }

      return res;
    },

    edgeReducer: (edge, data) => {
      const res = { ...data };
      const [src, tgt] = graph.extremities(edge);
      const active = graphState.hoveredNode || graphState.selectedNode;

      if (active) {
        if (src !== active && tgt !== active) {
          res.color = "rgba(148,163,184,0.06)";
          res.size  = 0.2;
        } else {
          res.size  = (data.size || 0.9) * 2.2;
          res.color = (EDGE_COLORS[data.edgeType] || "rgba(167,139,250,0.5)")
            .replace(/[\d.]+\)$/, "0.7)");
        }
      }

      if (graphState.searchQuery && graphState.searchMatches.size > 0) {
        if (!graphState.searchMatches.has(src) && !graphState.searchMatches.has(tgt)) {
          res.color = "rgba(148,163,184,0.06)";
          res.size  = 0.2;
        }
      }

      return res;
    },
  });

  // ── 커스텀 글로우 렌더링 (afterRender 훅) ──────────────────────────────────
  // sigma.js v3는 canvas layer를 직접 접근할 수 있음

  renderer.on("afterRender", () => {
    const layers = renderer.getCanvases();
    const edgesLayer = layers["edges"];
    if (!edgesLayer) return;
    // 엣지 레이어에 glow filter 적용 (CSS filter로 처리)
    edgesLayer.style.filter = "blur(0.5px)";
    edgesLayer.style.opacity = "0.9";
  });

  // ── 툴팁 ─────────────────────────────────────────────────────────────────────

  const tooltip = document.getElementById("graph-tooltip");

  function showTooltip(node, attrs, event) {
    if (!tooltip) return;
    const typeLabel = {
      category: "카테고리", subcategory: "서브카테고리",
      series: "시리즈", tag: "태그", post: "포스트",
    }[attrs.nodeType] || attrs.nodeType;

    const deg = graph.degree(node);
    let html = `<div class="gt-type gt-type--${attrs.nodeType}">${typeLabel}</div>`;
    html += `<div class="gt-label">${attrs.label}</div>`;
    if (attrs.date) html += `<div class="gt-meta">${attrs.date}</div>`;
    html += `<div class="gt-meta">연결 ${deg}개</div>`;
    html += `<div class="gt-hint">${attrs.nodeType === "post" ? "클릭하여 열기" : "클릭하여 상세 보기"}</div>`;

    tooltip.innerHTML = html;
    tooltip.classList.add("is-visible");
    positionTooltip(event);
  }

  function hideTooltip() {
    tooltip?.classList.remove("is-visible");
  }

  function positionTooltip(e) {
    if (!tooltip || !e) return;
    const rect = container.getBoundingClientRect();
    const x  = (e.original?.clientX ?? e.clientX ?? 0) - rect.left;
    const y  = (e.original?.clientY ?? e.clientY ?? 0) - rect.top;
    const tw = tooltip.offsetWidth  || 200;
    const th = tooltip.offsetHeight || 80;
    tooltip.style.left = (x + 16 + tw > rect.width  ? x - tw - 8 : x + 16) + "px";
    tooltip.style.top  = (y + 16 + th > rect.height ? y - th - 8 : y + 12) + "px";
  }

  container.addEventListener("mousemove", e => {
    if (graphState.hoveredNode && tooltip?.classList.contains("is-visible")) {
      positionTooltip({ clientX: e.clientX, clientY: e.clientY });
    }
  });

  // ── 정보 패널 ────────────────────────────────────────────────────────────────

  const panel      = document.getElementById("graph-info-panel");
  const panelBody  = document.getElementById("graph-panel-body");
  const panelClose = document.getElementById("graph-panel-close");

  function openPanel(node, attrs) {
    if (!panel || !panelBody) return;
    graphState.selectedNode = node;

    const typeLabel = {
      category: "카테고리", subcategory: "서브카테고리",
      series: "시리즈", tag: "태그", post: "포스트",
    }[attrs.nodeType] || attrs.nodeType;

    const neighbors = graph.neighbors(node);
    const posts = neighbors
      .filter(n => graph.getNodeAttribute(n, "nodeType") === "post")
      .map(n => ({
        id:    n,
        label: graph.getNodeAttribute(n, "label"),
        url:   graph.getNodeAttribute(n, "url"),
        date:  graph.getNodeAttribute(n, "date"),
      }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const otherNeighbors = neighbors
      .filter(n => graph.getNodeAttribute(n, "nodeType") !== "post")
      .map(n => ({
        id:    n,
        label: graph.getNodeAttribute(n, "label"),
        type:  graph.getNodeAttribute(n, "nodeType"),
      }));

    let html = "";
    html += `<div class="gp-type gp-type--${attrs.nodeType}">${typeLabel}</div>`;
    html += `<h2 class="gp-title">${attrs.label}</h2>`;
    if (attrs.date)       html += `<p class="gp-date">${attrs.date}</p>`;
    if (attrs.series)     html += `<p class="gp-series">시리즈: ${attrs.series}</p>`;
    if (attrs.difficulty) {
      const diff = { beginner: "입문", intermediate: "중급", advanced: "고급" }[attrs.difficulty] || attrs.difficulty;
      html += `<p class="gp-difficulty gp-difficulty--${attrs.difficulty}">${diff}</p>`;
    }

    html += `<div class="gp-stats">`;
    html += `<span>연결 ${graph.degree(node)}개</span>`;
    if (posts.length) html += `<span>포스트 ${posts.length}개</span>`;
    html += `</div>`;

    if (attrs.nodeType === "post" && attrs.url) {
      const base = document.querySelector('meta[name="site-url"]')?.content || "/";
      html += `<a class="gp-open-btn" href="${base}${attrs.url}">글 읽기</a>`;
    }

    if (posts.length > 0) {
      const base = document.querySelector('meta[name="site-url"]')?.content || "/";
      html += `<div class="gp-section-title">연관 포스트 (${posts.length})</div>`;
      html += `<ul class="gp-post-list">`;
      posts.slice(0, 10).forEach(p => {
        html += `<li class="gp-post-item">`;
        if (p.url) html += `<a href="${base}${p.url}" class="gp-post-link">${p.label}</a>`;
        else       html += `<span class="gp-post-label">${p.label}</span>`;
        if (p.date) html += `<span class="gp-post-date">${p.date}</span>`;
        html += `</li>`;
      });
      if (posts.length > 10) html += `<li class="gp-post-more">+${posts.length - 10}개 더</li>`;
      html += `</ul>`;
    }

    if (otherNeighbors.length > 0) {
      html += `<div class="gp-section-title">연결 노드</div>`;
      html += `<div class="gp-tags">`;
      otherNeighbors.slice(0, 12).forEach(n => {
        html += `<span class="gp-tag gp-tag--${n.type}" data-node-id="${n.id}">${n.label}</span>`;
      });
      html += `</div>`;
    }

    panelBody.innerHTML = html;
    panel.classList.add("is-open");

    panelBody.querySelectorAll(".gp-tag[data-node-id]").forEach(el => {
      el.addEventListener("click", () => {
        const nid = el.dataset.nodeId;
        if (graph.hasNode(nid)) {
          zoomToNode(nid);
          openPanel(nid, graph.getNodeAttributes(nid));
        }
      });
    });

    renderer.refresh();
  }

  function closePanel() {
    panel?.classList.remove("is-open");
    graphState.selectedNode = null;
    renderer.refresh();
  }

  panelClose?.addEventListener("click", closePanel);

  // ── 줌 ───────────────────────────────────────────────────────────────────────

  function zoomToNode(nodeId) {
    const pos = renderer.getNodeDisplayedCoordinates(nodeId);
    if (!pos) return;
    renderer.getCamera().animate({ x: pos.x, y: pos.y, ratio: 0.25 }, { duration: 500 });
  }

  // ── 이벤트 ───────────────────────────────────────────────────────────────────

  renderer.on("clickNode", ({ node }) => {
    hideTooltip();
    openPanel(node, graph.getNodeAttributes(node));
    zoomToNode(node);
  });

  renderer.on("clickStage", () => { closePanel(); hideTooltip(); });

  renderer.on("enterNode", ({ node, event }) => {
    graphState.hoveredNode = node;
    container.style.cursor = "pointer";
    showTooltip(node, graph.getNodeAttributes(node), event);
    renderer.refresh();
  });

  renderer.on("leaveNode", () => {
    graphState.hoveredNode = null;
    container.style.cursor = "default";
    hideTooltip();
    renderer.refresh();
  });

  // ── 필터 ─────────────────────────────────────────────────────────────────────

  function applyFilters() {
    graph.nodes().forEach(n => {
      graph.setNodeAttribute(n, "hidden", !activeFilters[graph.getNodeAttribute(n, "nodeType")]);
    });
    renderer.refresh();
  }

  document.querySelectorAll(".graph-filter-cb").forEach(cb => {
    const type = cb.dataset.type;
    cb.checked = activeFilters[type] ?? false;
    cb.addEventListener("change", e => {
      activeFilters[type] = e.target.checked;
      applyFilters();
    });
  });

  applyFilters();

  // ── 검색 ─────────────────────────────────────────────────────────────────────

  const searchInput = document.getElementById("graph-search");
  const searchClear = document.getElementById("graph-search-clear");

  function doSearch(q) {
    graphState.searchQuery = q;
    graphState.searchMatches.clear();
    if (q) {
      const ql = q.toLowerCase();
      graph.nodes().forEach(n => {
        if ((graph.getNodeAttribute(n, "label") || "").toLowerCase().includes(ql)) {
          graphState.searchMatches.add(n);
        }
      });
      const first = [...graphState.searchMatches][0];
      if (first) zoomToNode(first);
    }
    if (searchClear) searchClear.style.display = q ? "flex" : "none";
    renderer.refresh();
  }

  searchInput?.addEventListener("input", e => doSearch(e.target.value.trim()));
  if (searchClear) {
    searchClear.style.display = "none";
    searchClear.addEventListener("click", () => { searchInput.value = ""; doSearch(""); });
  }

  // ── 초기화 버튼 ──────────────────────────────────────────────────────────────

  document.getElementById("graph-reset")?.addEventListener("click", () => {
    renderer.getCamera().animatedReset();
  });

  // ── 통계 ─────────────────────────────────────────────────────────────────────

  const statsEl = document.getElementById("graph-stats");
  if (statsEl) {
    const m = rawData.metadata || {};
    statsEl.textContent = `${m.total_posts || 0} posts · ${m.total_tags || 0} tags · ${m.total_categories || 0} categories`;
  }

  currentRenderer = renderer;
  console.log(`graph-viz: ${graph.order} nodes, ${graph.size} edges`);
}

window.initGraphViz = init;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
