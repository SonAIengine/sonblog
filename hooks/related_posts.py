"""
MkDocs hook: 각 페이지 하단에 '관련 글' 섹션을 자동 삽입한다.

매칭 기준 (우선순위):
  1. 같은 서브디렉토리 (같은 시리즈)
  2. 공유 태그 수 (많을수록 관련도 높음)
  3. 같은 최상위 카테고리

최대 5개까지 표시한다.
"""

import os
import re
from collections import defaultdict
from urllib.parse import quote

# 전역 포스트 인덱스
_posts_index = []
_tags_to_posts = defaultdict(set)
_dir_to_posts = defaultdict(set)

EXCLUDE_FILES = {"index.md", "tags.md", ".pages", "graph.md"}
EXCLUDE_DIRS = {"blog", "assets"}


def _parse_frontmatter(content: str) -> dict:
    """프론트매터에서 title, date, tags, template, related를 파싱한다."""
    result = {}
    if not content.startswith("---"):
        return result
    end = content.find("---", 3)
    if end == -1:
        return result

    fm = content[3:end]
    for line in fm.splitlines():
        if line.startswith("title:"):
            result["title"] = line[6:].strip().strip('"').strip("'")
        elif line.startswith("date:"):
            result["date"] = line[5:].strip()
        elif line.startswith("template:"):
            result["template"] = line[9:].strip()

    # tags 파싱
    tags = []
    in_tags = False
    for line in fm.splitlines():
        if line.startswith("tags:"):
            in_tags = True
            # inline tags: tags: [a, b, c]
            inline = line[5:].strip()
            if inline.startswith("["):
                tags = [t.strip().strip('"').strip("'")
                        for t in inline.strip("[]").split(",") if t.strip()]
                in_tags = False
            continue
        if in_tags:
            if line.strip().startswith("- "):
                tags.append(line.strip()[2:].strip().strip('"').strip("'"))
            elif line.strip() and not line.startswith(" "):
                in_tags = False

    result["tags"] = tags

    # related 파싱 (명시적 관련 글 경로 목록)
    related = []
    in_related = False
    for line in fm.splitlines():
        if line.startswith("related:"):
            in_related = True
            inline = line[8:].strip()
            if inline.startswith("["):
                related = [r.strip().strip('"').strip("'")
                           for r in inline.strip("[]").split(",") if r.strip()]
                in_related = False
            continue
        if in_related:
            if line.strip().startswith("- "):
                related.append(line.strip()[2:].strip().strip('"').strip("'"))
            elif line.strip() and not line.startswith(" "):
                in_related = False

    result["related"] = related
    return result


def _get_url_path(docs_dir: str, file_path: str) -> str:
    """파일 경로를 MkDocs URL 경로로 변환한다."""
    rel = os.path.relpath(file_path, docs_dir)
    url = rel.replace("\\", "/")
    url = re.sub(r"\.md$", "/", url)
    parts = url.split("/")
    encoded = "/".join(quote(p, safe="") for p in parts)
    return encoded


def _get_subdir(docs_dir: str, file_path: str) -> str:
    """파일의 서브디렉토리 경로를 반환한다 (최상위 제외)."""
    rel = os.path.relpath(file_path, docs_dir).replace("\\", "/")
    parts = rel.split("/")
    if len(parts) >= 3:
        return "/".join(parts[:2])
    elif len(parts) >= 2:
        return parts[0]
    return ""


def _get_top_category(docs_dir: str, file_path: str) -> str:
    """최상위 카테고리를 반환한다."""
    rel = os.path.relpath(file_path, docs_dir).replace("\\", "/")
    return rel.split("/")[0] if "/" in rel else ""


def _build_index(docs_dir: str):
    """docs/ 디렉토리를 스캔하여 포스트 인덱스를 구축한다."""
    global _posts_index, _tags_to_posts, _dir_to_posts

    if _posts_index:
        return

    for root, dirs, files in os.walk(docs_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]

        for fname in files:
            if fname in EXCLUDE_FILES or not fname.endswith(".md"):
                continue

            fpath = os.path.join(root, fname)
            try:
                with open(fpath, encoding="utf-8") as f:
                    content = f.read()
            except Exception:
                continue

            meta = _parse_frontmatter(content)

            # template이 있는 특수 페이지 (home.html 등) 제외
            if meta.get("template"):
                continue

            title = meta.get("title")
            if not title:
                continue

            post = {
                "title": title,
                "date": meta.get("date", ""),
                "tags": set(meta.get("tags", [])),
                "related": meta.get("related", []),
                "url": _get_url_path(docs_dir, fpath),
                "subdir": _get_subdir(docs_dir, fpath),
                "category": _get_top_category(docs_dir, fpath),
                "path": fpath,
            }

            idx = len(_posts_index)
            _posts_index.append(post)

            for tag in post["tags"]:
                _tags_to_posts[tag].add(idx)

            _dir_to_posts[post["subdir"]].add(idx)


def _find_related(post_path: str, docs_dir: str, max_results: int = 5) -> list:
    """현재 페이지와 관련도가 높은 글을 찾는다."""
    _build_index(docs_dir)

    # 현재 포스트 찾기
    current = None
    current_idx = -1
    for i, p in enumerate(_posts_index):
        if p["path"] == post_path:
            current = p
            current_idx = i
            break

    if not current:
        return []

    # related: 필드에 명시된 경로를 인덱스로 매핑
    explicit_related_indices = set()
    if current["related"]:
        for rel_path in current["related"]:
            # related 경로는 docs/ 기준 상대 경로 (예: ai/XGEN/파일.md)
            for i, p in enumerate(_posts_index):
                p_rel = os.path.relpath(p["path"], docs_dir).replace("\\", "/")
                if p_rel == rel_path or p_rel.endswith(rel_path):
                    explicit_related_indices.add(i)
                    break

    # 점수 계산
    scores = {}
    for i, p in enumerate(_posts_index):
        if i == current_idx:
            continue

        score = 0

        # 명시적 related: 필드에 지정된 글: +20 (크로스 카테고리 연결 보장)
        if i in explicit_related_indices:
            score += 20

        # 같은 서브디렉토리: +10
        if p["subdir"] == current["subdir"] and current["subdir"]:
            score += 10

        # 공유 태그: 태그당 +3
        shared_tags = current["tags"] & p["tags"]
        score += len(shared_tags) * 3

        # 같은 최상위 카테고리: +1
        if p["category"] == current["category"] and current["category"]:
            score += 1

        if score > 0:
            scores[i] = score

    # 점수 내림차순, 같으면 날짜 최신순
    ranked = sorted(
        scores.keys(),
        key=lambda i: (scores[i], _posts_index[i].get("date", "")),
        reverse=True,
    )

    return [_posts_index[i] for i in ranked[:max_results]]


def _build_related_section(related: list) -> str:
    """관련 글 마크다운 섹션을 생성한다."""
    if not related:
        return ""

    lines = [
        "",
        "---",
        "",
        "**관련 글**",
        "",
    ]

    for post in related:
        tag_str = ""
        if post["tags"]:
            tags_list = sorted(post["tags"])[:3]
            tag_str = " " + " ".join(f"`{t}`" for t in tags_list)
        lines.append(f"- [{post['title']}](/{post['url']}){tag_str}")

    lines.append("")
    return "\n".join(lines)


# ── MkDocs Hook ──────────────────────────────────────────────────────────────

def on_page_markdown(markdown, page, config, files, **kwargs):
    """각 페이지 마크다운 하단에 관련 글 섹션을 삽입한다."""
    # 홈, 인덱스, 특수 페이지 제외
    if page.is_homepage:
        return markdown

    src_path = page.file.src_path
    if src_path.endswith("index.md") or src_path in ("tags.md", "graph.md"):
        return markdown

    # template이 지정된 특수 페이지 제외
    if page.meta and page.meta.get("template"):
        return markdown

    docs_dir = config["docs_dir"]
    post_path = os.path.join(docs_dir, src_path)

    related = _find_related(post_path, docs_dir, max_results=5)

    if not related:
        return markdown

    section = _build_related_section(related)
    return markdown + section
