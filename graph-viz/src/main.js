import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

// 기존 renderer 정리용
let currentRenderer = null;

// DOM이 준비된 후 실행 (외부에서 재호출 가능)
function init() {
  const container = document.getElementById("sigma-container");
  if (!container) return;

  const rawData = window.__GRAPH_DATA__;
  if (!rawData) {
    console.error("graph-viz: __GRAPH_DATA__ not found");
    return;
  }

  // 기존 renderer 정리 (instant navigation 재진입 시)
  if (currentRenderer) {
    try { currentRenderer.kill(); } catch (_) {}
    currentRenderer = null;
  }
  container.innerHTML = "";

  // ── 엣지 색상 매핑 ──────────────────────────────────────────────────────────

  const EDGE_COLORS = {
    inCategory:    "#9E9E9E",
    inSubcategory: "#BDBDBD",
    inSeries:      "#FF7043",
    hasTag:        "#80CBC4",
    related:       "#AB47BC",
    dependsOn:     "#42A5F5",
    tagCooccurs:   "#FFD54F",
  };

  // 노드 타입별 색상 (Obsidian 감성)
  const NODE_COLORS = {
    category:    "#7C3AED",   // 보라 (강조)
    subcategory: "#2563EB",   // 파랑
    series:      "#EA580C",   // 주황
    tag:         "#0D9488",   // 청록
    post:        "#DC2626",   // 빨강
  };

  // 초기 hidden 여부
  const NODE_HIDDEN_BY_TYPE = {
    category:    false,
    subcategory: false,
    series:      false,
    tag:         false,
    post:        true,
  };

  // 활성화된 타입 필터 상태
  const activeFilters = {
    category:    true,
    subcategory: true,
    series:      true,
    tag:         true,
    post:        false,
  };

  // ── 상태 ─────────────────────────────────────────────────────────────────────

  const graphState = {
    hoveredNode:  null,
    selectedNode: null,
    searchQuery:  "",
    searchMatches: new Set(),
  };

  // ── 연결 수 사전 계산 (노드 크기 비례용) ──────────────────────────────────

  // 각 노드의 총 엣지 수를 미리 계산
  const degreeMap = {};
  rawData.nodes.forEach(n => { degreeMap[n.id] = 0; });
  rawData.edges.forEach(e => {
    if (degreeMap[e.source] !== undefined) degreeMap[e.source]++;
    if (degreeMap[e.target] !== undefined) degreeMap[e.target]++;
  });

  function computeNodeSize(node) {
    const type = node.type;
    const deg  = degreeMap[node.id] || 0;
    switch (type) {
      case "category":    return 28;
      case "subcategory": return 18 + Math.min(deg * 0.3, 8);
      case "series":      return 16 + Math.min(deg * 0.5, 10);
      case "tag":         return Math.max(9, Math.min(28, 8 + deg * 1.2));
      case "post":        return Math.max(7, Math.min(22, 6 + deg * 1.8));
      default:            return 10;
    }
  }

  // ── graphology 그래프 구성 (directed) ────────────────────────────────────

  const graph = new Graph({ multi: false, type: "directed" });

  rawData.nodes.forEach((node) => {
    graph.addNode(node.id, {
      label:      node.label,
      size:       computeNodeSize(node),
      color:      NODE_COLORS[node.type] || node.color,
      nodeType:   node.type,
      url:        node.url   || null,
      date:       node.date  || null,
      series:     node.series || null,
      difficulty: node.difficulty || null,
      hidden:     NODE_HIDDEN_BY_TYPE[node.type] ?? false,
      x: Math.random() * 100,
      y: Math.random() * 100,
    });
  });

  // 중복 엣지 방지 (directed 그래프: source→target 방향 유지)
  const edgeSet = new Set();
  rawData.edges.forEach((edge) => {
    // directed이므로 순서 유지 (dependsOn은 단방향)
    const key = `${edge.source}--${edge.target}`;
    const reverseKey = `${edge.target}--${edge.source}`;
    if (
      edgeSet.has(key) ||
      edgeSet.has(reverseKey) ||
      !graph.hasNode(edge.source) ||
      !graph.hasNode(edge.target) ||
      edge.source === edge.target
    ) return;
    edgeSet.add(key);

    const isDirected = edge.type === "dependsOn" || edge.type === "related";
    graph.addDirectedEdge(edge.source, edge.target, {
      edgeType:  edge.type,
      weight:    edge.weight,
      color:     EDGE_COLORS[edge.type] || "#BDBDBD",
      size:      edge.type === "tagCooccurs" ? Math.min(edge.weight * 0.5, 3) : 0.8,
      // dependsOn/related만 화살표 표시
      type:      isDirected ? "arrow" : "line",
    });
  });

  // ── ForceAtlas2 레이아웃 ────────────────────────────────────────────────────

  // 타입별 동심원 초기 배치 (레이아웃 수렴 가속)
  const TYPE_RADIUS = { category: 1, subcategory: 0.75, series: 0.6, tag: 0.45, post: 0.25 };
  let idx = 0;
  graph.nodes().forEach((n) => {
    const type = graph.getNodeAttribute(n, "nodeType");
    const r    = (TYPE_RADIUS[type] || 0.5) * 400;
    const angle = (idx / graph.order) * 2 * Math.PI;
    graph.setNodeAttribute(n, "x", r * Math.cos(angle) + (Math.random() - 0.5) * 20);
    graph.setNodeAttribute(n, "y", r * Math.sin(angle) + (Math.random() - 0.5) * 20);
    idx++;
  });

  forceAtlas2.assign(graph, {
    iterations: 400,
    settings: {
      gravity:           0.8,
      scalingRatio:      25,
      barnesHutOptimize: true,
      barnesHutTheta:    0.5,
      strongGravityMode: false,   // 너무 뭉치지 않게
      linLogMode:        true,    // 허브-위성 구조 강조
      adjustSizes:       true,    // 노드 크기 기반 충돌 회피
      slowDown:          5,
    },
  });

  // ── Sigma 렌더러 ────────────────────────────────────────────────────────────

  const renderer = new Sigma(graph, container, {
    renderEdgeLabels:       false,
    enableEdgeClickEvents:  false,
    enableEdgeWheelEvents:  false,
    enableEdgeHoverEvents:  false,
    defaultNodeColor:       "#999",
    defaultEdgeColor:       "#BDBDBD",
    labelFont:              "Pretendard, sans-serif",
    labelSize:              12,
    labelWeight:            "600",
    labelColor:             { color: "#1a1a2e" },
    labelRenderedSizeThreshold: 8,   // 화면상 px 8 이상인 노드만 라벨 표시
    minCameraRatio:         0.03,
    maxCameraRatio:         8,
    // 화살표 크기
    defaultEdgeType:        "line",
    defaultArrowHeadLength: 6,

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
          res.color = "#e0e0e0";
          res.label = "";
          res.size  = data.size * 0.45;
          return res;
        } else {
          res.highlighted = true;
          res.size = data.size * 1.2;
        }
      }

      // hover / select 하이라이트
      if ((graphState.hoveredNode || graphState.selectedNode) && !isHovered && !isSelected) {
        if (!neighbors || !neighbors.has(node)) {
          res.color = "#d8d8d8";
          res.label = "";
          res.size  = data.size * 0.55;
          return res;
        }
        // 이웃 노드는 약간 밝게
        res.size = data.size * 1.1;
      }

      // 선택된 노드 강조
      if (isSelected) {
        res.size   = data.size * 1.5;
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
          res.color = "#eeeeee";
          res.size  = 0.2;
          res.hidden = false;
        } else {
          res.size  = (data.size || 0.8) * 2;
          res.color = EDGE_COLORS[data.edgeType] || data.color;
        }
      }

      if (graphState.searchQuery && graphState.searchMatches.size > 0) {
        if (!graphState.searchMatches.has(src) && !graphState.searchMatches.has(tgt)) {
          res.color = "#eeeeee";
          res.size  = 0.2;
        }
      }

      return res;
    },
  });

  // ── 툴팁 ────────────────────────────────────────────────────────────────────

  const tooltip = document.getElementById("graph-tooltip");

  function showTooltip(node, attrs, event) {
    if (!tooltip) return;
    const typeLabel = {
      category: "카테고리", subcategory: "서브카테고리",
      series: "시리즈", tag: "태그", post: "포스트"
    }[attrs.nodeType] || attrs.nodeType;

    const deg = graph.degree(node);
    let html = `<div class="gt-type gt-type--${attrs.nodeType}">${typeLabel}</div>`;
    html += `<div class="gt-label">${attrs.label}</div>`;
    if (attrs.date) html += `<div class="gt-meta">${attrs.date}</div>`;
    html += `<div class="gt-meta">연결: ${deg}개</div>`;
    if (attrs.nodeType === "post") {
      html += `<div class="gt-hint">클릭하여 열기</div>`;
    } else {
      html += `<div class="gt-hint">클릭하여 상세 보기</div>`;
    }

    tooltip.innerHTML = html;
    tooltip.classList.add("is-visible");
    positionTooltip(event);
  }

  function hideTooltip() {
    if (tooltip) tooltip.classList.remove("is-visible");
  }

  function positionTooltip(e) {
    if (!tooltip || !e) return;
    const rect = container.getBoundingClientRect();
    const x = (e.original?.clientX ?? e.clientX ?? 0) - rect.left;
    const y = (e.original?.clientY ?? e.clientY ?? 0) - rect.top;
    const tw = tooltip.offsetWidth || 200;
    const th = tooltip.offsetHeight || 80;
    tooltip.style.left = (x + 16 + tw > rect.width ? x - tw - 8 : x + 16) + "px";
    tooltip.style.top  = (y + 16 + th > rect.height ? y - th - 8 : y + 12) + "px";
  }

  container.addEventListener("mousemove", (e) => {
    if (graphState.hoveredNode && tooltip?.classList.contains("is-visible")) {
      positionTooltip({ clientX: e.clientX, clientY: e.clientY });
    }
  });

  // ── 우측 정보 패널 ──────────────────────────────────────────────────────────

  const panel     = document.getElementById("graph-info-panel");
  const panelBody = document.getElementById("graph-panel-body");
  const panelClose = document.getElementById("graph-panel-close");

  function openPanel(node, attrs) {
    if (!panel || !panelBody) return;
    graphState.selectedNode = node;

    const typeLabel = {
      category: "카테고리", subcategory: "서브카테고리",
      series: "시리즈", tag: "태그", post: "포스트"
    }[attrs.nodeType] || attrs.nodeType;

    // 연결 노드 목록
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

    // 헤더
    html += `<div class="gp-type gp-type--${attrs.nodeType}">${typeLabel}</div>`;
    html += `<h2 class="gp-title">${attrs.label}</h2>`;

    // 메타
    if (attrs.date) html += `<p class="gp-date">${attrs.date}</p>`;
    if (attrs.series) html += `<p class="gp-series">시리즈: ${attrs.series}</p>`;
    if (attrs.difficulty) {
      const diff = { beginner: "입문", intermediate: "중급", advanced: "고급" }[attrs.difficulty] || attrs.difficulty;
      html += `<p class="gp-difficulty gp-difficulty--${attrs.difficulty}">${diff}</p>`;
    }

    // 통계
    html += `<div class="gp-stats">`;
    html += `<span>연결 ${graph.degree(node)}개</span>`;
    if (posts.length) html += `<span>포스트 ${posts.length}개</span>`;
    html += `</div>`;

    // 포스트로 이동 버튼
    if (attrs.nodeType === "post" && attrs.url) {
      const base = document.querySelector('meta[name="site-url"]')?.content || "/";
      html += `<a class="gp-open-btn" href="${base}${attrs.url}">글 읽기</a>`;
    }

    // 연관 포스트
    if (posts.length > 0) {
      html += `<div class="gp-section-title">연관 포스트 (${posts.length})</div>`;
      html += `<ul class="gp-post-list">`;
      const base = document.querySelector('meta[name="site-url"]')?.content || "/";
      posts.slice(0, 10).forEach(p => {
        html += `<li class="gp-post-item">`;
        if (p.url) {
          html += `<a href="${base}${p.url}" class="gp-post-link">${p.label}</a>`;
        } else {
          html += `<span class="gp-post-label">${p.label}</span>`;
        }
        if (p.date) html += `<span class="gp-post-date">${p.date}</span>`;
        html += `</li>`;
      });
      if (posts.length > 10) {
        html += `<li class="gp-post-more">+${posts.length - 10}개 더</li>`;
      }
      html += `</ul>`;
    }

    // 연관 태그/카테고리
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

    // 연결 노드 클릭 → 해당 노드로 이동
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
    if (panel) panel.classList.remove("is-open");
    graphState.selectedNode = null;
    renderer.refresh();
  }

  if (panelClose) panelClose.addEventListener("click", closePanel);

  // ── 노드 줌 ─────────────────────────────────────────────────────────────────

  function zoomToNode(nodeId) {
    const nodePos = renderer.getNodeDisplayedCoordinates(nodeId);
    if (!nodePos) return;
    renderer.getCamera().animate(
      { x: nodePos.x, y: nodePos.y, ratio: 0.25 },
      { duration: 500 }
    );
  }

  // ── 이벤트 ──────────────────────────────────────────────────────────────────

  renderer.on("clickNode", ({ node, event }) => {
    const attrs = graph.getNodeAttributes(node);
    hideTooltip();
    openPanel(node, attrs);
    zoomToNode(node);
  });

  renderer.on("clickStage", () => {
    closePanel();
    hideTooltip();
  });

  renderer.on("enterNode", ({ node, event }) => {
    graphState.hoveredNode = node;
    container.style.cursor = "pointer";
    const attrs = graph.getNodeAttributes(node);
    showTooltip(node, attrs, event);
    renderer.refresh();
  });

  renderer.on("leaveNode", () => {
    graphState.hoveredNode = null;
    container.style.cursor = "default";
    hideTooltip();
    renderer.refresh();
  });

  // ── 필터 체크박스 ────────────────────────────────────────────────────────────

  function applyFilters() {
    graph.nodes().forEach((n) => {
      const type = graph.getNodeAttribute(n, "nodeType");
      graph.setNodeAttribute(n, "hidden", !activeFilters[type]);
    });
    renderer.refresh();
  }

  document.querySelectorAll(".graph-filter-cb").forEach(cb => {
    const type = cb.dataset.type;
    cb.checked = activeFilters[type] ?? false;
    cb.addEventListener("change", (e) => {
      activeFilters[type] = e.target.checked;
      applyFilters();
    });
  });

  // 초기 필터 적용
  applyFilters();

  // ── 검색 ────────────────────────────────────────────────────────────────────

  const searchInput = document.getElementById("graph-search");
  const searchClear = document.getElementById("graph-search-clear");

  function doSearch(q) {
    graphState.searchQuery = q;
    graphState.searchMatches.clear();
    if (q) {
      const ql = q.toLowerCase();
      graph.nodes().forEach(n => {
        const label = graph.getNodeAttribute(n, "label") || "";
        if (label.toLowerCase().includes(ql)) {
          graphState.searchMatches.add(n);
        }
      });
      // 검색 결과 첫 번째 노드로 줌
      const first = [...graphState.searchMatches][0];
      if (first) zoomToNode(first);
    }
    if (searchClear) searchClear.style.display = q ? "flex" : "none";
    renderer.refresh();
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => doSearch(e.target.value.trim()));
  }
  if (searchClear) {
    searchClear.style.display = "none";
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      doSearch("");
    });
  }

  // ── 뷰 초기화 ────────────────────────────────────────────────────────────────

  const resetBtn = document.getElementById("graph-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      renderer.getCamera().animatedReset();
    });
  }

  // ── 노드 수 통계 업데이트 ──────────────────────────────────────────────────

  const statsEl = document.getElementById("graph-stats");
  if (statsEl) {
    const m = rawData.metadata || {};
    statsEl.textContent =
      `${m.total_posts || 0} posts · ${m.total_tags || 0} tags · ${m.total_categories || 0} categories`;
  }

  currentRenderer = renderer;
  console.log(`graph-viz: ${graph.order} nodes, ${graph.size} edges`);
}

// 외부 노출 (graph.html에서 instant navigation 이후 재호출)
window.initGraphViz = init;

// 첫 로드 시 실행
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
