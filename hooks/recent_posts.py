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
    "portfolio": "Portfolio",
    "full-stack": "Full Stack",
    "search-engine": "Search Engine",
    "ai": "AI",
    "devops": "DevOps",
    # 하위 폴더도 매핑 (full-stack 하위)
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
    """마크다운 프론트매터에서 title, date, description, tags를 파싱한다."""
    result = {}
    if not content.startswith("---"):
        return result

    end = content.find("---", 3)
    if end == -1:
        return result

    frontmatter = content[3:end]
    in_tags = False
    tags = []

    for line in frontmatter.splitlines():
        if line.startswith("title:"):
            title = line[6:].strip().strip('"').strip("'")
            result["title"] = title
            in_tags = False
        elif line.startswith("date:"):
            date_str = line[5:].strip()
            try:
                result["date"] = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
            in_tags = False
        elif line.startswith("description:"):
            desc = line[12:].strip().strip('"').strip("'")
            result["description"] = desc
            in_tags = False
        elif line.startswith("tags:"):
            in_tags = True
        elif in_tags and line.strip().startswith("- "):
            tags.append(line.strip()[2:].strip())
        elif in_tags and not line.strip().startswith("- "):
            in_tags = False

    if tags:
        result["tags"] = tags

    return result


def estimate_reading_time(content: str) -> int:
    """본문 글자 수 기반 읽기 시간(분)을 추정한다. 한글 기준 분당 500자."""
    # 프론트매터 제거
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:]
    # 코드블록 제거
    content = re.sub(r"```[\s\S]*?```", "", content)
    # 마크다운 문법 제거
    content = re.sub(r"[#*`\[\]()>|_~]", "", content)
    char_count = len(content.strip())
    minutes = max(1, round(char_count / 500))
    return minutes


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

            tags = meta.get("tags", [])
            description = meta.get("description", "")
            reading_time = estimate_reading_time(content)

            posts.append({
                "title": title,
                "date": post_date,
                "url": url,
                "category": category,
                "tags": tags,
                "description": description,
                "reading_time": reading_time,
            })

    # date 내림차순 정렬 후 limit개 반환
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts[:limit]


# 카테고리 폴더 → 카드 키 매핑
CATEGORY_FOLDER_MAP = {
    "portfolio": "portfolio",
    "full-stack": "full_stack",
    "search-engine": "search_engine",
    "ai": "ai",
    "devops": "devops",
}


def count_posts_by_category(docs_dir: str) -> dict:
    """카테고리별 글 수를 집계한다 (index.md 제외한 모든 .md 파일)."""
    counts = {key: 0 for key in CATEGORY_FOLDER_MAP.values()}
    counts["total"] = 0

    for root, dirs, files in os.walk(docs_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "blog"]

        for fname in files:
            if fname in EXCLUDE_FILES or not fname.endswith(".md"):
                continue

            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, docs_dir).replace("\\", "/")
            top_folder = rel.split("/")[0]

            key = CATEGORY_FOLDER_MAP.get(top_folder)
            if key:
                counts[key] += 1
            counts["total"] += 1

    return counts


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


# Featured Posts: 수동 선정
FEATURED_SLUGS = [
    "ai/XGEN/xgen-2-0-model-serving-integration-architecture-refactoring.md",
    "ai/agent/graph-tool-call-llm-agent-graph-based-tool-search-engine.md",
    "search-engine/rust-search/rust-commerce-search-engine-build.md",
]


def collect_featured(docs_dir: str) -> list:
    """FEATURED_SLUGS에 해당하는 글의 메타데이터를 반환한다."""
    featured = []
    for slug in FEATURED_SLUGS:
        fpath = os.path.join(docs_dir, slug)
        if not os.path.exists(fpath):
            continue
        try:
            with open(fpath, encoding="utf-8") as f:
                content = f.read()
        except Exception:
            continue
        meta = parse_frontmatter(content)
        if "title" not in meta:
            continue
        featured.append({
            "title": meta["title"],
            "date": meta.get("date", date.today()),
            "url": get_url_path(docs_dir, fpath),
            "category": get_category(docs_dir, fpath),
            "description": meta.get("description", ""),
            "tags": meta.get("tags", []),
        })
    return featured


# MkDocs hook: on_env
def on_env(env, config, files, **kwargs):
    """Jinja2 환경에 recent_posts, featured_posts, post_counts 전역 변수를 주입한다."""
    docs_dir = config["docs_dir"]
    posts = collect_posts(docs_dir, limit=6)
    featured = collect_featured(docs_dir)
    counts = count_posts_by_category(docs_dir)
    env.globals["recent_posts"] = posts
    env.globals["featured_posts"] = featured
    env.globals["post_counts"] = counts
    return env
