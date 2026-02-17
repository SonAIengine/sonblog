"""
MkDocs hook: 온톨로지 기반 지식 그래프 데이터를 생성한다.

- docs/ 재귀 스캔
- 디렉토리 = Category / SubCategory 노드
- tags front matter = Tag 노드
- 파일 = BlogPost 노드
- 관계: inCategory, inSubcategory, hasTag, tagCooccurs
- 결과: env.globals['graph_data'] (Jinja2) + site/assets/graph/graph-data.json
"""

import json
import os
import re
from collections import defaultdict
from urllib.parse import quote

# 최상위 카테고리 폴더 → 표시 이름
TOP_CATEGORIES = {
    "ai": "AI",
    "search-engine": "Search Engine",
    "devops": "DevOps",
    "full-stack": "Full Stack",
}

EXCLUDE_FILES = {"index.md", "tags.md", ".pages"}
EXCLUDE_DIRS = {"blog", "assets"}

# on_env → on_post_build 데이터 전달용
_graph_data = None


# ── 유틸리티 ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """노드 ID 생성용 슬러그. 영숫자/한글/하이픈만 유지."""
    text = text.strip().lower()
    text = re.sub(r"[\s_/\\]+", "-", text)
    text = re.sub(r"[^\w가-힣\-]", "", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def parse_frontmatter(content: str) -> dict:
    """title, date, tags, description을 파싱한다."""
    result = {}
    if not content.startswith("---"):
        return result

    end = content.find("---", 3)
    if end == -1:
        return result

    fm = content[3:end]

    # title
    m = re.search(r'^title:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
    if m:
        result["title"] = m.group(1).strip()

    # date
    m = re.search(r'^date:\s*(\d{4}-\d{2}-\d{2})', fm, re.MULTILINE)
    if m:
        result["date"] = m.group(1)

    # tags (YAML 리스트)
    tags_m = re.search(r'^tags:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)', fm, re.MULTILINE)
    if tags_m:
        result["tags"] = re.findall(r'-\s+(.+)', tags_m.group(1))
    else:
        # 인라인 형식: tags: [a, b, c]
        inline = re.search(r'^tags:\s*\[(.+)\]', fm, re.MULTILINE)
        if inline:
            result["tags"] = [t.strip().strip('"\'') for t in inline.group(1).split(",")]

    return result


def get_url_path(docs_dir: str, file_path: str) -> str:
    """파일 경로를 MkDocs URL 경로로 변환한다."""
    rel = os.path.relpath(file_path, docs_dir)
    url = rel.replace("\\", "/")
    url = re.sub(r"\.md$", "/", url)
    parts = url.split("/")
    return "/".join(quote(p, safe="") for p in parts)


# ── 그래프 빌드 ───────────────────────────────────────────────────────────────

def build_graph(docs_dir: str) -> dict:
    nodes = {}   # id → node dict
    edges = []
    tag_post_map = defaultdict(list)   # tag_id → [post_id]
    post_tag_map = defaultdict(list)   # post_id → [tag_id]

    # ── 1. 카테고리 노드 ──
    for folder, label in TOP_CATEGORIES.items():
        cat_id = f"cat:{folder}"
        nodes[cat_id] = {
            "id": cat_id,
            "label": label,
            "type": "category",
            "color": "#5C6BC0",
            "size": 24,
            "x": 0.0,
            "y": 0.0,
        }

    # ── 2. docs/ 재귀 스캔 ──
    for root, dirs, files in os.walk(docs_dir):
        dirs[:] = [
            d for d in dirs
            if not d.startswith(".") and d not in EXCLUDE_DIRS
        ]

        rel_root = os.path.relpath(root, docs_dir).replace("\\", "/")
        parts = rel_root.split("/") if rel_root != "." else []

        # 서브카테고리 노드 (depth 2: docs/ai/XGEN/)
        if len(parts) == 2 and parts[0] in TOP_CATEGORIES:
            subcat_id = f"subcat:{slugify(parts[0])}-{slugify(parts[1])}"
            if subcat_id not in nodes:
                nodes[subcat_id] = {
                    "id": subcat_id,
                    "label": parts[1],
                    "type": "subcategory",
                    "color": "#7986CB",
                    "size": 16,
                    "x": 0.0,
                    "y": 0.0,
                }
                edges.append({
                    "source": subcat_id,
                    "target": f"cat:{parts[0]}",
                    "type": "inCategory",
                    "weight": 1,
                })

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

            # title: front matter → 파일명 fallback
            title = meta.get("title") or fname.replace(".md", "").replace("-", " ").replace("_", " ")

            post_id = f"post:{slugify(rel_root + '-' + fname)}"
            nodes[post_id] = {
                "id": post_id,
                "label": title,
                "type": "post",
                "color": "#EF5350",
                "size": 8,
                "url": get_url_path(docs_dir, fpath),
                "date": meta.get("date", ""),
                "x": 0.0,
                "y": 0.0,
            }

            # 포스트 → 서브카테고리 or 카테고리 엣지
            if len(parts) == 2 and parts[0] in TOP_CATEGORIES:
                subcat_id = f"subcat:{slugify(parts[0])}-{slugify(parts[1])}"
                edges.append({
                    "source": post_id,
                    "target": subcat_id,
                    "type": "inSubcategory",
                    "weight": 1,
                })
            elif len(parts) == 1 and parts[0] in TOP_CATEGORIES:
                edges.append({
                    "source": post_id,
                    "target": f"cat:{parts[0]}",
                    "type": "inCategory",
                    "weight": 1,
                })

            # 태그 처리
            for tag in meta.get("tags", []):
                tag = tag.strip()
                if not tag:
                    continue
                tag_id = f"tag:{slugify(tag)}"
                if tag_id not in nodes:
                    nodes[tag_id] = {
                        "id": tag_id,
                        "label": tag,
                        "type": "tag",
                        "color": "#26A69A",
                        "size": 10,
                        "x": 0.0,
                        "y": 0.0,
                    }
                edges.append({
                    "source": post_id,
                    "target": tag_id,
                    "type": "hasTag",
                    "weight": 1,
                })
                tag_post_map[tag_id].append(post_id)
                post_tag_map[post_id].append(tag_id)

    # ── 3. 태그 노드 크기 조정 (포스트 수 비례) ──
    for tag_id, post_ids in tag_post_map.items():
        if tag_id in nodes:
            count = len(post_ids)
            nodes[tag_id]["size"] = max(10, min(30, 8 + count * 1.5))

    # ── 4. tagCooccurs 엣지 (2개 이상 포스트에서 공유하는 태그 쌍) ──
    tag_pair_count = defaultdict(int)
    for post_id, tag_ids in post_tag_map.items():
        for i, t1 in enumerate(tag_ids):
            for t2 in tag_ids[i + 1:]:
                pair = tuple(sorted([t1, t2]))
                tag_pair_count[pair] += 1

    for (t1, t2), count in tag_pair_count.items():
        if count >= 2:
            edges.append({
                "source": t1,
                "target": t2,
                "type": "tagCooccurs",
                "weight": count,
            })

    # ── 5. 엣지 ID 부여 ──
    for i, edge in enumerate(edges):
        edge["id"] = f"e{i}"

    # ── 6. 메타데이터 ──
    metadata = {
        "total_posts": sum(1 for n in nodes.values() if n["type"] == "post"),
        "total_tags": sum(1 for n in nodes.values() if n["type"] == "tag"),
        "total_categories": sum(1 for n in nodes.values() if n["type"] == "category"),
        "total_subcategories": sum(1 for n in nodes.values() if n["type"] == "subcategory"),
        "total_edges": len(edges),
    }

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "metadata": metadata,
    }


# ── MkDocs 훅 ─────────────────────────────────────────────────────────────────

def on_env(env, config, files, **kwargs):
    """그래프 데이터를 Jinja2 환경에 주입한다."""
    global _graph_data
    docs_dir = config["docs_dir"]
    _graph_data = build_graph(docs_dir)

    node_count = len(_graph_data["nodes"])
    edge_count = len(_graph_data["edges"])
    print(f"  graph_builder: {node_count} nodes, {edge_count} edges")

    env.globals["graph_data"] = _graph_data
    env.globals["graph_metadata"] = _graph_data["metadata"]
    return env


def on_post_build(config, **kwargs):
    """graph-data.json을 site/assets/graph/에 출력한다."""
    global _graph_data
    if _graph_data is None:
        return

    output_dir = os.path.join(config["site_dir"], "assets", "graph")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "graph-data.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(_graph_data, f, ensure_ascii=False)

    print(f"  graph_builder: graph-data.json → {output_path}")
