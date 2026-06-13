"""
MkDocs hook: series 프론트매터가 있는 글 상단(첫 H1 다음)에 시리즈 네비게이션을 삽입한다.

같은 series에 속한 글들을 series_order(없으면 제목) 기준으로 정렬하여
  - 진행도 (현재 n / 전체 total편)
  - 시리즈 전체 글 목록 (현재 글 강조)
  - 이전 / 다음 글 링크
를 접을 수 있는 admonition 박스로 보여준다.
"""

import os
import re
from collections import defaultdict
from urllib.parse import quote

# {series_name: [{order, title, url, path}, ...]} — 최초 1회만 구축
_series_index = None

EXCLUDE_FILES = {"index.md", "tags.md", ".pages", "graph.md"}
EXCLUDE_DIRS = {"blog", "assets"}


def _parse_series(content: str):
    """프론트매터에서 series, series_order, title을 파싱한다."""
    if not content.startswith("---"):
        return None, None, None
    end = content.find("---", 3)
    if end == -1:
        return None, None, None

    series = order = title = None
    for line in content[3:end].splitlines():
        if line.startswith("series:"):
            series = line[7:].strip().strip('"').strip("'")
        elif line.startswith("series_order:"):
            try:
                order = int(line[13:].strip())
            except ValueError:
                pass
        elif line.startswith("title:"):
            title = line[6:].strip().strip('"').strip("'")
    return series, order, title


def _url(docs_dir: str, fpath: str) -> str:
    """파일 경로를 절대 URL 경로로 변환한다."""
    rel = os.path.relpath(fpath, docs_dir).replace("\\", "/")
    rel = re.sub(r"\.md$", "/", rel)
    return "/" + "/".join(quote(p, safe="") for p in rel.split("/"))


def _build_index(docs_dir: str):
    """docs/ 를 스캔하여 series별 글 목록을 구축한다."""
    global _series_index
    if _series_index is not None:
        return

    idx = defaultdict(list)
    for root, dirs, files in os.walk(docs_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for fname in files:
            if fname in EXCLUDE_FILES or not fname.endswith(".md"):
                continue
            fpath = os.path.join(root, fname)
            try:
                content = open(fpath, encoding="utf-8").read()
            except Exception:
                continue
            series, order, title = _parse_series(content)
            if not series or not title:
                continue
            idx[series].append({
                "order": order if order is not None else 999,
                "title": title,
                "url": _url(docs_dir, fpath),
                "path": fpath,
            })

    for series in idx:
        idx[series].sort(key=lambda x: (x["order"], x["title"]))
    _series_index = idx


def _build_box(series: str, items: list, cur_path: str) -> str:
    """시리즈 네비게이션 admonition 마크다운을 생성한다."""
    total = len(items)
    pos = next((i for i, it in enumerate(items) if it["path"] == cur_path), None)
    if pos is None:
        return ""

    lines = [f'???+ abstract "시리즈 · {series} ({pos + 1} / {total}편)"', ""]
    for i, it in enumerate(items):
        n = i + 1
        if i == pos:
            lines.append(f"    {n}. **{it['title']} — 현재 글**")
        else:
            lines.append(f"    {n}. [{it['title']}]({it['url']})")

    nav = []
    if pos > 0:
        prev = items[pos - 1]
        nav.append(f"← 이전: [{prev['title']}]({prev['url']})")
    if pos < total - 1:
        nxt = items[pos + 1]
        nav.append(f"다음: [{nxt['title']}]({nxt['url']}) →")
    if nav:
        lines.append("")
        lines.append("    " + " &nbsp;·&nbsp; ".join(nav))

    return "\n".join(lines)


def _insert_after_h1(markdown: str, box: str) -> str:
    """첫 H1 다음에 박스를 삽입한다. H1이 없으면 본문 맨 앞에 둔다."""
    lines = markdown.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("# "):
            head = "\n".join(lines[:i + 1])
            tail = "\n".join(lines[i + 1:])
            return f"{head}\n\n{box}\n\n{tail}"
    return f"{box}\n\n{markdown}"


# ── MkDocs Hook ──────────────────────────────────────────────────────────────

def on_page_markdown(markdown, page, config, files, **kwargs):
    if page.is_homepage:
        return markdown

    src = page.file.src_path
    if src.endswith("index.md") or src in ("tags.md", "graph.md"):
        return markdown

    meta = page.meta or {}
    if meta.get("template"):
        return markdown

    series = meta.get("series")
    if not series:
        return markdown

    docs_dir = config["docs_dir"]
    _build_index(docs_dir)

    items = _series_index.get(series)
    if not items or len(items) < 2:
        return markdown

    box = _build_box(series, items, os.path.join(docs_dir, src))
    if not box:
        return markdown

    return _insert_after_h1(markdown, box)
