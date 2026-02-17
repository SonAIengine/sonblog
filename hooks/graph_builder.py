"""
MkDocs hook: 온톨로지 기반 지식 그래프 데이터를 생성한다.

노드 타입:
  - category    : 최상위 카테고리 (AI, Search Engine, DevOps, Full Stack)
  - subcategory : 디렉토리 depth-2 (XGEN, Rust 검색 엔진 등)
  - series      : front matter series 필드 → 글 묶음 노드
  - tag         : front matter tags 필드
  - post        : 개별 블로그 글

엣지 타입:
  - inCategory    : post/subcat → cat
  - inSubcategory : post → subcat
  - inSeries      : post → series
  - hasTag        : post → tag
  - related       : post ↔ post  (front matter related 필드)
  - dependsOn     : post → post  (front matter depends_on 필드)
  - tagCooccurs   : tag ↔ tag  (2+ 글에서 공유)

마이그레이션 호환:
  - 모든 노드/엣지의 id 체계는 안정적 slug 기반
  - series/related/depends_on front matter는 RDF 트리플 / Neo4j 관계로 직접 마이그레이션 가능
"""

import json
import os
import re
from collections import defaultdict
from urllib.parse import quote

TOP_CATEGORIES = {
    "ai": "AI",
    "search-engine": "Search Engine",
    "devops": "DevOps",
    "full-stack": "Full Stack",
}

EXCLUDE_FILES = {"index.md", "tags.md", ".pages"}
EXCLUDE_DIRS  = {"blog", "assets"}

_graph_data = None


# ── 유틸리티 ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[\s_/\\]+", "-", text)
    text = re.sub(r"[^\w가-힣\-]", "", text)
    return re.sub(r"-+", "-", text).strip("-")


def _yaml_list(fm: str, key: str) -> list[str]:
    """YAML front matter에서 리스트 필드를 파싱한다. 블록/인라인 형식 모두 지원."""
    # 블록: key:\n  - item
    block = re.search(
        rf'^{key}:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)', fm, re.MULTILINE
    )
    if block:
        return [v.strip() for v in re.findall(r'-\s+(.+)', block.group(1)) if v.strip()]

    # 인라인: key: [a, b]
    inline = re.search(rf'^{key}:\s*\[(.+)\]', fm, re.MULTILINE)
    if inline:
        return [v.strip().strip('"\'') for v in inline.group(1).split(",") if v.strip()]

    return []


def _yaml_scalar(fm: str, key: str) -> str:
    m = re.search(rf'^{key}:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
    return m.group(1).strip() if m else ""


def parse_frontmatter(content: str) -> dict:
    """
    지원 필드:
      title, description, date, tags,
      series, series_order, related, depends_on, difficulty
    """
    result: dict = {}
    if not content.startswith("---"):
        return result

    end = content.find("---", 3)
    if end == -1:
        return result

    fm = content[3:end]

    for scalar in ("title", "description", "date", "series", "difficulty"):
        v = _yaml_scalar(fm, scalar)
        if v:
            result[scalar] = v

    # series_order (정수)
    m = re.search(r'^series_order:\s*(\d+)', fm, re.MULTILINE)
    if m:
        result["series_order"] = int(m.group(1))

    for lst in ("tags", "related", "depends_on"):
        items = _yaml_list(fm, lst)
        if items:
            result[lst] = items

    return result


def get_url_path(docs_dir: str, file_path: str) -> str:
    rel = os.path.relpath(file_path, docs_dir).replace("\\", "/")
    url = re.sub(r"\.md$", "/", rel)
    return "/".join(quote(p, safe="") for p in url.split("/"))


# ── 노드 팩토리 ────────────────────────────────────────────────────────────────

def _cat_node(folder: str, label: str) -> dict:
    return {"id": f"cat:{folder}", "label": label,
            "type": "category", "color": "#5C6BC0", "size": 24, "x": 0.0, "y": 0.0}

def _subcat_node(sid: str, label: str) -> dict:
    return {"id": sid, "label": label,
            "type": "subcategory", "color": "#7986CB", "size": 16, "x": 0.0, "y": 0.0}

def _series_node(sid: str, label: str) -> dict:
    return {"id": sid, "label": label,
            "type": "series", "color": "#FF7043", "size": 18, "x": 0.0, "y": 0.0}

def _tag_node(tid: str, label: str) -> dict:
    return {"id": tid, "label": label,
            "type": "tag", "color": "#26A69A", "size": 10, "x": 0.0, "y": 0.0}

def _edge(src: str, tgt: str, etype: str, weight: int = 1) -> dict:
    return {"source": src, "target": tgt, "type": etype, "weight": weight}


# ── 그래프 빌드 ───────────────────────────────────────────────────────────────

def build_graph(docs_dir: str) -> dict:
    nodes: dict  = {}
    edges: list  = []
    tag_post_map = defaultdict(list)
    post_tag_map = defaultdict(list)

    # post_id → list of relative paths (related/depends_on 역참조)
    post_related:    dict[str, list[str]] = {}
    post_depends_on: dict[str, list[str]] = {}
    # docs 상대 경로 → post_id (역참조 해결용)
    rel_to_post_id:  dict[str, str]       = {}

    # ── 1. 카테고리 노드 ──────────────────────────────────────────────────────
    for folder, label in TOP_CATEGORIES.items():
        cid = f"cat:{folder}"
        nodes[cid] = _cat_node(folder, label)

    # ── 2. docs/ 재귀 스캔 ───────────────────────────────────────────────────
    for root, dirs, files in os.walk(docs_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in EXCLUDE_DIRS]

        rel_root = os.path.relpath(root, docs_dir).replace("\\", "/")
        parts    = rel_root.split("/") if rel_root != "." else []

        # 서브카테고리 노드 (depth == 2)
        if len(parts) == 2 and parts[0] in TOP_CATEGORIES:
            sid = f"subcat:{slugify(parts[0])}-{slugify(parts[1])}"
            if sid not in nodes:
                nodes[sid] = _subcat_node(sid, parts[1])
                edges.append(_edge(sid, f"cat:{parts[0]}", "inCategory"))

        # 파일 처리
        for fname in files:
            if fname in EXCLUDE_FILES or not fname.endswith(".md"):
                continue

            fpath = os.path.join(root, fname)
            try:
                with open(fpath, encoding="utf-8") as f:
                    content = f.read()
            except Exception:
                continue

            meta = parse_frontmatter(content)
            title = (meta.get("title")
                     or fname.replace(".md", "").replace("-", " ").replace("_", " "))

            post_id = f"post:{slugify(rel_root + '-' + fname)}"
            rel_path = os.path.relpath(fpath, docs_dir).replace("\\", "/")
            rel_to_post_id[rel_path] = post_id

            nodes[post_id] = {
                "id":         post_id,
                "label":      title,
                "type":       "post",
                "color":      "#EF5350",
                "size":       8,
                "url":        get_url_path(docs_dir, fpath),
                "date":       meta.get("date", ""),
                "series":     meta.get("series", ""),
                "series_order": meta.get("series_order", 0),
                "difficulty": meta.get("difficulty", ""),
                "x": 0.0, "y": 0.0,
            }

            # 카테고리 / 서브카테고리 엣지
            if len(parts) == 2 and parts[0] in TOP_CATEGORIES:
                subcat_id = f"subcat:{slugify(parts[0])}-{slugify(parts[1])}"
                edges.append(_edge(post_id, subcat_id, "inSubcategory"))
            elif len(parts) == 1 and parts[0] in TOP_CATEGORIES:
                edges.append(_edge(post_id, f"cat:{parts[0]}", "inCategory"))

            # 시리즈 노드 + 엣지
            series_name = meta.get("series", "")
            if series_name:
                ser_id = f"series:{slugify(series_name)}"
                if ser_id not in nodes:
                    nodes[ser_id] = _series_node(ser_id, series_name)
                edges.append(_edge(post_id, ser_id, "inSeries"))

            # 태그 처리
            for tag in meta.get("tags", []):
                tag = tag.strip()
                if not tag:
                    continue
                tag_id = f"tag:{slugify(tag)}"
                if tag_id not in nodes:
                    nodes[tag_id] = _tag_node(tag_id, tag)
                edges.append(_edge(post_id, tag_id, "hasTag"))
                tag_post_map[tag_id].append(post_id)
                post_tag_map[post_id].append(tag_id)

            # related / depends_on (2nd pass에서 해결)
            if meta.get("related"):
                post_related[post_id] = meta["related"]
            if meta.get("depends_on"):
                post_depends_on[post_id] = meta["depends_on"]

    # ── 3. 태그 크기 조정 ────────────────────────────────────────────────────
    for tag_id, post_ids in tag_post_map.items():
        if tag_id in nodes:
            nodes[tag_id]["size"] = max(10, min(30, 8 + len(post_ids) * 1.5))

    # ── 4. tagCooccurs 엣지 ──────────────────────────────────────────────────
    pair_count: dict[tuple, int] = defaultdict(int)
    for _, tag_ids in post_tag_map.items():
        for i, t1 in enumerate(tag_ids):
            for t2 in tag_ids[i + 1:]:
                pair_count[tuple(sorted([t1, t2]))] += 1

    for (t1, t2), cnt in pair_count.items():
        if cnt >= 2:
            edges.append(_edge(t1, t2, "tagCooccurs", cnt))

    # ── 5. related / dependsOn 엣지 (2nd pass) ───────────────────────────────
    def resolve(post_id: str, paths: list[str], etype: str) -> None:
        for path in paths:
            path = path.strip()
            tgt_id = rel_to_post_id.get(path)
            if tgt_id and tgt_id in nodes and tgt_id != post_id:
                edges.append(_edge(post_id, tgt_id, etype))

    for post_id, paths in post_related.items():
        resolve(post_id, paths, "related")

    for post_id, paths in post_depends_on.items():
        resolve(post_id, paths, "dependsOn")

    # ── 6. 엣지 ID 부여 ──────────────────────────────────────────────────────
    for i, edge in enumerate(edges):
        edge["id"] = f"e{i}"

    # ── 7. 메타데이터 ────────────────────────────────────────────────────────
    type_counts = defaultdict(int)
    for n in nodes.values():
        type_counts[n["type"]] += 1

    metadata = {
        "total_posts":        type_counts["post"],
        "total_tags":         type_counts["tag"],
        "total_categories":   type_counts["category"],
        "total_subcategories": type_counts["subcategory"],
        "total_series":       type_counts["series"],
        "total_edges":        len(edges),
    }

    return {"nodes": list(nodes.values()), "edges": edges, "metadata": metadata}


# ── MkDocs 훅 ─────────────────────────────────────────────────────────────────

def on_env(env, config, files, **kwargs):
    global _graph_data
    _graph_data = build_graph(config["docs_dir"])

    n = len(_graph_data["nodes"])
    e = len(_graph_data["edges"])
    m = _graph_data["metadata"]
    print(f"  graph_builder: {n} nodes, {e} edges "
          f"(series:{m['total_series']}, tags:{m['total_tags']}, posts:{m['total_posts']})")

    env.globals["graph_data"]     = _graph_data
    env.globals["graph_metadata"] = _graph_data["metadata"]
    return env


def on_post_build(config, **kwargs):
    global _graph_data
    if _graph_data is None:
        return

    output_dir  = os.path.join(config["site_dir"], "assets", "graph")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "graph-data.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(_graph_data, f, ensure_ascii=False)

    print(f"  graph_builder: graph-data.json → {output_path}")
