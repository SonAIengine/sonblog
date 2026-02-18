import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

let currentRenderer = null;
let starfieldAnimId  = null;

// ── 다크모드 감지 ──────────────────────────────────────────────────────────────

function isDarkMode() {
  return document.documentElement.getAttribute("data-md-color-scheme") === "slate";
}

// ── 별 파티클 배경 (다크모드 전용) ──────────────────────────────────────────────

function startStarfield(container) {
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

  const stars = Array.from({ length: 200 }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    r:  Math.random() * 1.2 + 0.2,
    alpha: Math.random() * 0.6 + 0.2,
    dAlpha: (Math.random() * 0.005 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.alpha += s.dAlpha;
      if (s.alpha > 0.85 || s.alpha < 0.1) s.dAlpha *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 200, 255, ${s.alpha})`;
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

  const dark = isDarkMode();

  // ── 색상 팔레트 (light / dark 분리) ────────────────────────────────────────

  const NODE_COLORS = dark ? {
    category:    "#a78bfa",   // 라벤더
    subcategory: "#60a5fa",   // 아이스 블루
    series:      "#fb923c",   // 오렌지
    tag:         "#34d399",   // 에메랄드
    post:        "#f472b6",   // 핑크
  } : {
    category:    "#7C3AED",   // 보라
    subcategory: "#2563EB",   // 파랑
    series:      "#EA580C",   // 주황
    tag:         "#0D9488",   // 청록
    post:        "#DC2626",   // 빨강
  };

  const EDGE_COLORS = dark ? {
    inCategory:    "rgba(167,139,250,0.5)",
    inSubcategory: "rgba(96,165,250,0.4)",
    inSeries:      "rgba(251,146,60,0.55)",
    hasTag:        "rgba(52,211,153,0.4)",
    related:       "rgba(192,132,252,0.55)",
    dependsOn:     "rgba(96,165,250,0.6)",
    tagCooccurs:   "rgba(253,224,71,0.3)",
  } : {
    inCategory:    "#9333ea",   // 보라 (불투명)
    inSubcategory: "#3b82f6",   // 파랑
    inSeries:      "#ea580c",   // 주황
    hasTag:        "#0d9488",   // 청록
    related:       "#8b5cf6",   // 연보라
    dependsOn:     "#2563eb",   // 진파랑
    tagCooccurs:   "#94a3b8",   // 슬레이트 그레이
  };

  const LABEL_COLOR  = dark ? "#e2e8f0" : "#1a1a2e";
  const LABEL_BG     = dark ? "rgba(7,11,24,0.7)" : "rgba(255,255,255,0)";  // 라이트: 투명 (엣지 가림 방지)
  const DEFAULT_EDGE = dark ? "rgba(148,163,184,0.25)" : "#94a3b8";          // 라이트: 불투명 회색

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

  // ── 연결 수 계산 ─────────────────────────────────────────────────────────────

  const degreeMap = {};
  rawData.nodes.forEach(n => { degreeMap[n.id] = 0; });
  rawData.edges.forEach(e => {
    if (degreeMap[e.source] !== undefined) degreeMap[e.source]++;
    if (degreeMap[e.target] !== undefined) degreeMap[e.target]++;
  });

  function computeNodeSize(node) {
    const deg = degreeMap[node.id] || 0;
    switch (node.type) {
      case "category":    return 28;
      case "subcategory": return 16 + Math.min(deg * 0.3, 7);
      // 태그는 크기 제한 강화 (blob 방지)
      case "tag":         return Math.max(7, Math.min(18, 6 + deg * 0.8));
      case "series":      return Math.max(10, Math.min(22, 10 + deg * 0.4));
      case "post":        return Math.max(6, Math.min(16, 5 + deg * 1.5));
      default:            return 8;
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
      color:    EDGE_COLORS[edge.type] || DEFAULT_EDGE,
      size:     edge.type === "tagCooccurs" ? Math.min(edge.weight * 0.5, 2.0) : 1.2,
      type:     isDirected ? "arrow" : "line",
    });
  });

  // ── 초기 배치: 타입별 섹터 ───────────────────────────────────────────────────

  const TYPE_RADIUS = {
    category: 80, subcategory: 220, series: 280, tag: 360, post: 300,
  };

  const catNodes    = graph.nodes().filter(n => graph.getNodeAttribute(n, "nodeType") === "category");
  const catAngleMap = {};
  catNodes.forEach((n, i) => {
    const angle = (i / Math.max(catNodes.length, 1)) * 2 * Math.PI;
    catAngleMap[n] = angle;
    graph.setNodeAttribute(n, "x", TYPE_RADIUS.category * Math.cos(angle));
    graph.setNodeAttribute(n, "y", TYPE_RADIUS.category * Math.sin(angle));
  });

  const nodeCatAngle = {};
  graph.nodes()
    .filter(n => graph.getNodeAttribute(n, "nodeType") === "subcategory")
    .forEach(n => {
      const parentCat = graph.neighbors(n).find(nb => graph.getNodeAttribute(nb, "nodeType") === "category");
      const base = parentCat ? (catAngleMap[parentCat] || 0) : Math.random() * 2 * Math.PI;
      const jitter = (Math.random() - 0.5) * (Math.PI / Math.max(catNodes.length, 1));
      nodeCatAngle[n] = base + jitter;
      graph.setNodeAttribute(n, "x", TYPE_RADIUS.subcategory * Math.cos(base + jitter));
      graph.setNodeAttribute(n, "y", TYPE_RADIUS.subcategory * Math.sin(base + jitter));
    });

  graph.nodes()
    .filter(n => ["series", "tag", "post"].includes(graph.getNodeAttribute(n, "nodeType")))
    .forEach(n => {
      const type = graph.getNodeAttribute(n, "nodeType");
      const nbs  = graph.neighbors(n);
      const parentSubcat = nbs.find(nb => graph.getNodeAttribute(nb, "nodeType") === "subcategory");
      const parentCat    = nbs.find(nb => graph.getNodeAttribute(nb, "nodeType") === "category");
      let base;
      if (parentSubcat && nodeCatAngle[parentSubcat] !== undefined) base = nodeCatAngle[parentSubcat];
      else if (parentCat && catAngleMap[parentCat] !== undefined)    base = catAngleMap[parentCat];
      else base = Math.random() * 2 * Math.PI;
      const jitter = (Math.random() - 0.5) * (Math.PI * 0.6);
      const r = TYPE_RADIUS[type] || 300;
      graph.setNodeAttribute(n, "x", r * Math.cos(base + jitter) + (Math.random() - 0.5) * 30);
      graph.setNodeAttribute(n, "y", r * Math.sin(base + jitter) + (Math.random() - 0.5) * 30);
    });

  forceAtlas2.assign(graph, {
    iterations: 600,
    settings: {
      gravity:           0.3,
      scalingRatio:      55,
      barnesHutOptimize: true,
      barnesHutTheta:    0.5,
      strongGravityMode: false,
      linLogMode:        true,
      adjustSizes:       true,
      slowDown:          8,
    },
  });

  // ── 다크모드: 별 파티클 ──────────────────────────────────────────────────────
  if (dark) startStarfield(container);

  // ── Sigma 렌더러 ─────────────────────────────────────────────────────────────

  const renderer = new Sigma(graph, container, {
    renderEdgeLabels:           false,
    enableEdgeClickEvents:      false,
    enableEdgeWheelEvents:      false,
    enableEdgeHoverEvents:      false,
    defaultNodeColor:           NODE_COLORS.tag,
    defaultEdgeColor:           DEFAULT_EDGE,
    labelFont:                  "Pretendard, sans-serif",
    labelSize:                  12,
    labelWeight:                "600",
    labelColor:                 { color: LABEL_COLOR },
    labelBackgroundColor:       LABEL_BG,
    labelRenderedSizeThreshold: 10,
    minCameraRatio:             0.03,
    maxCameraRatio:             8,
    defaultEdgeType:            "line",
    defaultArrowHeadLength:     10,

    nodeReducer: (node, data) => {
      const res = { ...data };
      const isSelected = graphState.selectedNode === node;
      const isHovered  = graphState.hoveredNode  === node;
      const neighbors  = graphState.hoveredNode
        ? new Set(graph.neighbors(graphState.hoveredNode))
        : (graphState.selectedNode ? new Set(graph.neighbors(graphState.selectedNode)) : null);

      // 기본 테두리 — 타입별 색상으로 노드 구분 강화
      const nodeType = data.nodeType;
      if (nodeType === "post" || nodeType === "tag") {
        res.borderColor = dark
          ? (nodeType === "post" ? "rgba(244,114,182,0.6)" : "rgba(52,211,153,0.5)")
          : (nodeType === "post" ? "rgba(220,38,38,0.5)"   : "rgba(13,148,136,0.45)");
        res.borderSize = 1.5;
      }

      if (graphState.searchQuery && graphState.searchMatches.size > 0) {
        if (!graphState.searchMatches.has(node)) {
          res.color = dark ? "#1e293b" : "#cbd5e1";
          res.label = "";
          res.size  = data.size * 0.4;
          res.borderSize = 0;
          return res;
        }
        res.size = data.size * 1.3;
        res.borderColor = dark ? "#fbbf24" : "#d97706";
        res.borderSize  = 2.5;
      }

      if ((graphState.hoveredNode || graphState.selectedNode) && !isHovered && !isSelected) {
        if (!neighbors || !neighbors.has(node)) {
          // hidden 노드는 그대로 숨김, 보이는 노드는 희미하게 표시
          if (data.hidden) return res;
          res.color = dark ? "#374151" : "#b0bec5";
          res.label = "";
          res.size  = data.size * 0.7;
          res.borderSize = 0;
          return res;
        }
        res.size = data.size * 1.1;
      }

      if (isHovered) {
        res.borderColor = dark ? "#f8fafc" : "#1e293b";
        res.borderSize  = 2;
      }

      if (isSelected) {
        res.size        = data.size * 1.6;
        res.zIndex      = 10;
        res.borderColor = dark ? "#fbbf24" : "#b45309";
        res.borderSize  = 3;
      }

      return res;
    },

    edgeReducer: (edge, data) => {
      const res = { ...data };

      // hidden 엣지는 건드리지 않음 (applyFilters에서 이미 처리)
      if (data.hidden) return res;

      const [src, tgt] = graph.extremities(edge);
      const active = graphState.hoveredNode || graphState.selectedNode;

      if (active) {
        if (src !== active && tgt !== active) {
          // 비활성 엣지: 숨기지 않고 연하게 표시
          res.color = dark ? "#1e293b" : "#d1d5db";
          res.size  = 0.3;
        } else {
          res.size  = (data.size || 1) * 2.5;
          res.color = EDGE_COLORS[data.edgeType] || DEFAULT_EDGE;
        }
      }

      if (graphState.searchQuery && graphState.searchMatches.size > 0) {
        if (!graphState.searchMatches.has(src) && !graphState.searchMatches.has(tgt)) {
          res.color = dark ? "#1e293b" : "#d1d5db";
          res.size  = 0.2;
        }
      }

      return res;
    },
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

  function hideTooltip() { tooltip?.classList.remove("is-visible"); }

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

    const base = document.querySelector('meta[name="site-url"]')?.content || "/";

    // ── 상단 헤더 영역 (sticky)
    let headerHtml = `<div class="gp-node-header gp-node-header--${attrs.nodeType}">`;
    headerHtml += `<div class="gp-node-meta"><div class="gp-type gp-type--${attrs.nodeType}">${typeLabel}</div>`;
    if (attrs.difficulty) {
      const diff = { beginner: "입문", intermediate: "중급", advanced: "고급" }[attrs.difficulty] || attrs.difficulty;
      headerHtml += `<span class="gp-difficulty gp-difficulty--${attrs.difficulty}">${diff}</span>`;
    }
    headerHtml += `</div>`;
    headerHtml += `<h2 class="gp-title">${attrs.label}</h2>`;
    if (attrs.series) {
      headerHtml += `<div class="gp-series-badge"><span class="gp-series-dot"></span>${attrs.series}</div>`;
    }
    if (attrs.date) headerHtml += `<p class="gp-date">${attrs.date}</p>`;

    // stat row
    headerHtml += `<div class="gp-stat-row">`;
    headerHtml += `<div class="gp-stat"><span class="gp-stat-val">${graph.degree(node)}</span><span class="gp-stat-lbl">연결</span></div>`;
    if (posts.length) {
      headerHtml += `<div class="gp-stat"><span class="gp-stat-val">${posts.length}</span><span class="gp-stat-lbl">포스트</span></div>`;
    }
    if (otherNeighbors.length) {
      headerHtml += `<div class="gp-stat"><span class="gp-stat-val">${otherNeighbors.length}</span><span class="gp-stat-lbl">노드</span></div>`;
    }
    headerHtml += `</div>`;
    headerHtml += `</div>`; // .gp-node-header

    // ── 스크롤 가능한 본문
    let bodyHtml = `<div class="gp-scroll-body">`;

    // 포스트 리스트
    if (posts.length > 0) {
      bodyHtml += `<div class="gp-section">`;
      bodyHtml += `<div class="gp-section-title">연관 포스트<span class="gp-section-count">${posts.length}</span></div>`;
      bodyHtml += `<ul class="gp-post-list">`;
      posts.slice(0, 10).forEach(p => {
        bodyHtml += `<li class="gp-post-item">`;
        bodyHtml += `<div class="gp-post-row">`;
        bodyHtml += p.url
          ? `<a href="${base}${p.url}" class="gp-post-link">${p.label}</a>`
          : `<span class="gp-post-label">${p.label}</span>`;
        bodyHtml += `</div>`;
        if (p.date) bodyHtml += `<div class="gp-post-meta-row"><span class="gp-post-date">${p.date}</span></div>`;
        bodyHtml += `</li>`;
      });
      if (posts.length > 10) {
        bodyHtml += `<li class="gp-post-more">+${posts.length - 10}개 더</li>`;
      }
      bodyHtml += `</ul></div>`;
    }

    // 연결 노드 — 타입별 그룹핑
    if (otherNeighbors.length > 0) {
      const typeOrder = ["category", "subcategory", "series", "tag"];
      const typeLabels = { category: "카테고리", subcategory: "서브카테고리", series: "시리즈", tag: "태그" };
      const grouped = {};
      otherNeighbors.forEach(n => {
        if (!grouped[n.type]) grouped[n.type] = [];
        grouped[n.type].push(n);
      });

      bodyHtml += `<div class="gp-section">`;
      bodyHtml += `<div class="gp-section-title">연결 노드<span class="gp-section-count">${otherNeighbors.length}</span></div>`;
      typeOrder.forEach(t => {
        if (!grouped[t] || grouped[t].length === 0) return;
        bodyHtml += `<div class="gp-conn-group">`;
        bodyHtml += `<span class="gp-conn-group-label gp-type--${t}">${typeLabels[t]}</span>`;
        bodyHtml += `<div class="gp-tags">`;
        grouped[t].slice(0, 15).forEach(n => {
          bodyHtml += `<span class="gp-tag gp-tag--${n.type}" data-node-id="${n.id}">${n.label}</span>`;
        });
        bodyHtml += `</div></div>`;
      });
      bodyHtml += `</div>`;
    }

    bodyHtml += `</div>`; // .gp-scroll-body

    // ── post 타입: CTA를 패널 하단 sticky로
    let footerHtml = "";
    if (attrs.nodeType === "post" && attrs.url) {
      footerHtml = `<div class="gp-panel-footer"><a class="gp-open-btn" href="${base}${attrs.url}">글 읽기</a></div>`;
    }

    panelBody.innerHTML = headerHtml + bodyHtml + footerHtml;
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
    if (!graph.hasNode(nodeId)) return;
    const x = graph.getNodeAttribute(nodeId, "x");
    const y = graph.getNodeAttribute(nodeId, "y");
    if (x == null || y == null) return;
    const { x: cx, y: cy } = renderer.graphToViewport({ x, y });
    const cam = renderer.getCamera();
    cam.animate(
      renderer.viewportToFramedGraph({ x: cx, y: cy }),
      { duration: 500 }
    );
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
    // 숨겨진 노드에 연결된 엣지도 숨김 처리
    graph.edges().forEach(e => {
      const [src, tgt] = graph.extremities(e);
      const hidden = graph.getNodeAttribute(src, "hidden") || graph.getNodeAttribute(tgt, "hidden");
      graph.setEdgeAttribute(e, "hidden", hidden);
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

  // ── 리셋 / 통계 ──────────────────────────────────────────────────────────────

  document.getElementById("graph-reset")?.addEventListener("click", () => {
    renderer.getCamera().animatedReset();
  });

  const statsEl = document.getElementById("graph-stats");
  if (statsEl) {
    const m = rawData.metadata || {};
    statsEl.textContent = `${m.total_posts || 0} posts · ${m.total_tags || 0} tags · ${m.total_categories || 0} categories`;
  }

  currentRenderer = renderer;
  console.log(`graph-viz: ${graph.order} nodes, ${graph.size} edges [${dark ? "dark" : "light"}]`);
}

window.initGraphViz = init;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
