"""
MkDocs hook: 빌드 시점에 docs/ 디렉토리를 스캔하여
프론트매터의 date 기준으로 Recent Posts 목록을 생성하고
home.html 템플릿에 주입한다.
"""

import os
import re
from datetime import date, datetime
from pathlib import Path


# 카테고리 폴더 → 표시 이름 매핑
CATEGORY_LABELS = {
    "full-stack": "Full Stack",
    "search-engine": "Search Engine",
    "ai": "AI",
    "devops": "DevOps",
    # 하위 폴더도 매핑 (full-stack 하위)
    "portfolio": "Full Stack",
    "python": "Full Stack",
    "poc": "Full Stack",
    # devops 하위
    "infra": "DevOps",
    "xgen": "DevOps",
    "etc": "DevOps",
}

# 제외할 파일 패턴
EXCLUDE_FILES = {"index.md", ".pages"}


def parse_frontmatter(content: str) -> dict:
    """마크다운 프론트매터에서 title, date를 파싱한다."""
    result = {}
    if not content.startswith("---"):
        return result

    end = content.find("---", 3)
    if end == -1:
        return result

    frontmatter = content[3:end]

    for line in frontmatter.splitlines():
        if line.startswith("title:"):
            title = line[6:].strip().strip('"').strip("'")
            result["title"] = title
        elif line.startswith("date:"):
            date_str = line[5:].strip()
            try:
                result["date"] = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                pass

    return result


def get_url_path(docs_dir: str, file_path: str) -> str:
    """파일 경로를 MkDocs URL 경로로 변환한다."""
    rel = os.path.relpath(file_path, docs_dir)
    # .md 제거, 슬래시 정규화
    url = rel.replace("\\", "/")
    url = re.sub(r"\.md$", "/", url)
    # URL 인코딩 (한글, 공백 등)
    from urllib.parse import quote
    parts = url.split("/")
    encoded = "/".join(quote(p, safe="") for p in parts)
    return encoded


def get_category(docs_dir: str, file_path: str) -> str:
    """파일 경로에서 카테고리 레이블을 추출한다."""
    rel = os.path.relpath(file_path, docs_dir)
    parts = rel.replace("\\", "/").split("/")
    if parts:
        folder = parts[0]
        return CATEGORY_LABELS.get(folder, folder.replace("-", " ").title())
    return "Uncategorized"


def collect_posts(docs_dir: str, limit: int = 8) -> list:
    """docs/ 디렉토리를 재귀 스캔하여 date 기준 최신 글을 반환한다."""
    posts = []

    for root, dirs, files in os.walk(docs_dir):
        # blog/, .뭔가 디렉토리 제외
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "blog"]

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

            if "date" not in meta:
                continue

            title = meta.get("title", fname.replace(".md", "").replace("-", " "))
            post_date = meta["date"]
            url = get_url_path(docs_dir, fpath)
            category = get_category(docs_dir, fpath)

            posts.append({
                "title": title,
                "date": post_date,
                "url": url,
                "category": category,
            })

    # date 내림차순 정렬 후 limit개 반환
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts[:limit]


def build_recent_posts_html(posts: list) -> str:
    """Recent Posts HTML 조각을 생성한다."""
    if not posts:
        return ""

    items = []
    for post in posts:
        date_str = post["date"].strftime("%Y.%m.%d")
        items.append(
            f'    <a href="{post["url"]}" class="recent-item">\n'
            f'      <span class="recent-category">{post["category"]}</span>\n'
            f'      <span class="recent-title">{post["title"]}</span>\n'
            f'      <span class="recent-date">{date_str}</span>\n'
            f'    </a>'
        )

    return "\n".join(items)


# MkDocs hook: on_env
def on_env(env, config, files, **kwargs):
    """Jinja2 환경에 recent_posts 전역 변수를 주입한다."""
    docs_dir = config["docs_dir"]
    posts = collect_posts(docs_dir, limit=5)
    env.globals["recent_posts"] = posts
    return env
