import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { circular } from "graphology-layout";

// DOM이 준비된 후 실행
function init() {
  const container = document.getElementById("sigma-container");
  if (!container) {
    console.error("sigma-container not found");
    return;
  }

  const rawData = window.__GRAPH_DATA__;
  if (!rawData) {
    console.error("__GRAPH_DATA__ not found");
    return;
  }

  // ── 엣지 색상 매핑 ──────────────────────────────────────────────────────────

  const EDGE_COLORS = {
    inCategory: "#9E9E9E",
    inSubcategory: "#BDBDBD",
    hasTag: "#80CBC4",
    tagCooccurs: "#FFD54F",
  };

  // 초기 hidden 여부
  const NODE_HIDDEN_BY_TYPE = {
    category: false,
    subcategory: false,
    tag: false,
    post: true,
  };

  // ── 상태 (reducer에서 참조하므로 먼저 선언) ─────────────────────────────────

  const graphState = {
    hoveredNode: null,
    searchQuery: "",
  };

  // ── graphology 그래프 구성 ──────────────────────────────────────────────────

  const graph = new Graph({ multi: false, type: "undirected" });

  rawData.nodes.forEach((node) => {
    graph.addNode(node.id, {
      label: node.label,
      size: node.size,
      color: node.color,
      nodeType: node.type,
      url: node.url || null,
      date: node.date || null,
      hidden: NODE_HIDDEN_BY_TYPE[node.type] ?? false,
      x: node.x != null ? node.x : Math.random() * 100,
      y: node.y != null ? node.y : Math.random() * 100,
    });
  });

  // 중복 엣지 방지
  const edgeSet = new Set();
  rawData.edges.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join("--");
    if (
      edgeSet.has(key) ||
      !graph.hasNode(edge.source) ||
      !graph.hasNode(edge.target) ||
      edge.source === edge.target
    )
      return;
    edgeSet.add(key);

    graph.addEdge(edge.source, edge.target, {
      edgeType: edge.type,
      weight: edge.weight,
      color: EDGE_COLORS[edge.type] || "#BDBDBD",
      size: edge.type === "tagCooccurs" ? Math.min(edge.weight * 0.5, 3) : 0.8,
    });
  });

  // ── ForceAtlas2 레이아웃 ────────────────────────────────────────────────────

  circular.assign(graph);
  forceAtlas2.assign(graph, {
    iterations: 200,
    settings: {
      gravity: 0.5,
      scalingRatio: 10,
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      strongGravityMode: false,
      linLogMode: false,
    },
  });

  // ── Sigma 렌더러 ────────────────────────────────────────────────────────────

  const renderer = new Sigma(graph, container, {
    renderEdgeLabels: false,
    enableEdgeClickEvents: false,
    enableEdgeWheelEvents: false,
    enableEdgeHoverEvents: false,
    defaultNodeColor: "#999",
    defaultEdgeColor: "#BDBDBD",
    labelFont: "Pretendard, sans-serif",
    labelSize: 12,
    labelWeight: "normal",
    minCameraRatio: 0.05,
    maxCameraRatio: 5,
    nodeReducer: (node, data) => {
      const res = { ...data };
      if (graphState.hoveredNode && graphState.hoveredNode !== node) {
        if (!graph.neighbors(graphState.hoveredNode).includes(node)) {
          res.color = "#e0e0e0";
          res.label = "";
          res.size = data.size * 0.7;
        }
      }
      if (graphState.searchQuery) {
        const match = data.label.toLowerCase().includes(graphState.searchQuery);
        if (!match) {
          res.color = "#e0e0e0";
          res.label = "";
        }
      }
      return res;
    },
    edgeReducer: (edge, data) => {
      const res = { ...data };
      if (graphState.hoveredNode) {
        const [src, tgt] = graph.extremities(edge);
        if (src !== graphState.hoveredNode && tgt !== graphState.hoveredNode) {
          res.color = "#f0f0f0";
          res.size = 0.3;
        }
      }
      return res;
    },
  });

  // ── 이벤트 ──────────────────────────────────────────────────────────────────

  renderer.on("clickNode", ({ node }) => {
    const attrs = graph.getNodeAttributes(node);
    if (attrs.nodeType === "post" && attrs.url) {
      const base =
        document.querySelector('meta[name="site-url"]')?.content ||
        "https://sonaiengine.github.io/sonblog/";
      window.location.href = base + attrs.url;
    }
  });

  renderer.on("enterNode", ({ node }) => {
    graphState.hoveredNode = node;
    container.style.cursor = "pointer";
    renderer.refresh();
  });

  renderer.on("leaveNode", () => {
    graphState.hoveredNode = null;
    container.style.cursor = "default";
    renderer.refresh();
  });

  // ── 컨트롤 UI ───────────────────────────────────────────────────────────────

  const showPostsToggle = document.getElementById("show-posts");
  if (showPostsToggle) {
    showPostsToggle.checked = false;
    showPostsToggle.addEventListener("change", (e) => {
      graph.nodes().forEach((n) => {
        if (graph.getNodeAttribute(n, "nodeType") === "post") {
          graph.setNodeAttribute(n, "hidden", !e.target.checked);
        }
      });
      renderer.refresh();
    });
  }

  const searchInput = document.getElementById("graph-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      graphState.searchQuery = e.target.value.trim().toLowerCase();
      renderer.refresh();
    });
  }

  const resetBtn = document.getElementById("graph-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      renderer.getCamera().animatedReset();
    });
  }

  console.log(`graph-viz: ${graph.order} nodes, ${graph.size} edges rendered`);
}

// DOM 준비 완료 후 실행
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
