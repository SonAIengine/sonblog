import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { circular } from "graphology-layout";

// ── 초기화 ────────────────────────────────────────────────────────────────────

const container = document.getElementById("sigma-container");
if (!container) {
  console.error("sigma-container not found");
  throw new Error("sigma-container not found");
}

const rawData = window.__GRAPH_DATA__;
if (!rawData) {
  console.error("__GRAPH_DATA__ not found");
  throw new Error("__GRAPH_DATA__ not found");
}

// ── 엣지 색상 매핑 ───────────────────────────────────────────────────────────

const EDGE_COLORS = {
  inCategory: "#9E9E9E",
  inSubcategory: "#BDBDBD",
  hasTag: "#80CBC4",
  tagCooccurs: "#FFD54F",
};

// 노드 타입별 기본 hidden 여부
const NODE_HIDDEN_BY_TYPE = {
  category: false,
  subcategory: false,
  tag: false,
  post: true, // 초기에 포스트 숨김 (성능)
};

// ── graphology 그래프 구성 ────────────────────────────────────────────────────

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
    x: node.x ?? Math.random() * 100,
    y: node.y ?? Math.random() * 100,
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

// ── ForceAtlas2 레이아웃 (동기, GitHub Pages SharedArrayBuffer 불가) ──────────

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

// ── Sigma 렌더러 초기화 ───────────────────────────────────────────────────────

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
  // 노드 reducers: hover/search 상태 반영
  nodeReducer: (node, data) => {
    const res = { ...data };
    const state = graphState;

    if (state.hoveredNode && state.hoveredNode !== node) {
      if (!graph.neighbors(state.hoveredNode).includes(node)) {
        res.color = "#e0e0e0";
        res.label = "";
        res.size = data.size * 0.8;
      }
    }

    if (state.searchQuery) {
      const match = data.label.toLowerCase().includes(state.searchQuery);
      if (!match) {
        res.color = "#e0e0e0";
        res.label = "";
      }
    }

    return res;
  },
  edgeReducer: (edge, data) => {
    const res = { ...data };
    const state = graphState;

    if (state.hoveredNode) {
      const [src, tgt] = graph.extremities(edge);
      if (src !== state.hoveredNode && tgt !== state.hoveredNode) {
        res.color = "#f0f0f0";
        res.size = 0.3;
      }
    }

    return res;
  },
});

// ── 상태 관리 ─────────────────────────────────────────────────────────────────

const graphState = {
  hoveredNode: null,
  searchQuery: "",
  showPosts: false,
};

// ── 이벤트 핸들러 ─────────────────────────────────────────────────────────────

// 노드 클릭: 포스트면 해당 URL로 이동
renderer.on("clickNode", ({ node }) => {
  const attrs = graph.getNodeAttributes(node);
  if (attrs.nodeType === "post" && attrs.url) {
    const base = document.querySelector('meta[name="site-url"]')?.content || "/";
    window.location.href = base + attrs.url;
  }
});

// 호버: 이웃 노드 하이라이트
renderer.on("enterNode", ({ node }) => {
  graphState.hoveredNode = node;
  renderer.refresh();
});

renderer.on("leaveNode", () => {
  graphState.hoveredNode = null;
  renderer.refresh();
});

// 커서 변경
renderer.on("enterNode", () => {
  container.style.cursor = "pointer";
});
renderer.on("leaveNode", () => {
  container.style.cursor = "default";
});

// ── 컨트롤 UI ─────────────────────────────────────────────────────────────────

// 포스트 표시 토글
const showPostsToggle = document.getElementById("show-posts");
if (showPostsToggle) {
  showPostsToggle.addEventListener("change", (e) => {
    graphState.showPosts = e.target.checked;
    graph.nodes().forEach((n) => {
      if (graph.getNodeAttribute(n, "nodeType") === "post") {
        graph.setNodeAttribute(n, "hidden", !e.target.checked);
      }
    });
    renderer.refresh();
  });
}

// 검색 필터
const searchInput = document.getElementById("graph-search");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    graphState.searchQuery = q;
    renderer.refresh();
  });
}

// 리셋 뷰
const resetBtn = document.getElementById("graph-reset");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    renderer.getCamera().animatedReset();
  });
}

// 포스트 필터 체크박스를 초기 상태와 동기화
if (showPostsToggle) showPostsToggle.checked = false;

console.log(
  `graph-viz: ${graph.order} nodes, ${graph.size} edges rendered`
);
