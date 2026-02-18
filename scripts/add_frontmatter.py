#!/usr/bin/env python3
"""
frontmatter가 없거나 불완전한 .md 파일에 자동으로 frontmatter를 추가하는 스크립트.
- title: H1 또는 파일명에서 추출
- description: 본문 첫 의미 있는 단락에서 추출 (최대 2문장)
- date: git log 첫 커밋 날짜
- tags: 디렉토리 경로 + 키워드에서 추론
"""

import os
import re
import subprocess
import sys

DOCS_DIR = "docs"

# 제외할 파일 패턴
EXCLUDE_FILES = {
    "docs/index.md",
    "docs/blog/index.md",
    "docs/tags.md",
    "docs/graph.md",
}

# 제외할 파일명 패턴 (index.md는 카테고리 페이지)
EXCLUDE_PATTERNS = [
    r"index\.md$",
    r"\.pages$",
]

# 디렉토리 → 태그 매핑
DIR_TAG_MAP = {
    "OpenSearch": ["OpenSearch"],
    "Qdrant": ["Qdrant", "벡터 검색"],
    "RAG": ["RAG"],
    "NestJS 검색 엔진": ["NestJS", "검색엔진"],
    "Rust 검색 엔진": ["Rust", "검색엔진"],
    "시맨틱 검색": ["시맨틱 검색", "임베딩"],
    "XGEN": ["XGEN", "LLM"],
    "Model Serve": ["LLM Serving"],
    "딥러닝 기초": ["딥러닝", "AI"],
    "파인튜닝": ["파인튜닝", "LLM"],
    "agent": ["AI Agent"],
    "infra": ["DevOps", "인프라"],
    "xgen": ["XGEN", "DevOps"],
    "etc": ["DevOps"],
    "poc": ["PoC"],
    "python": ["Python"],
    "frontend": ["Frontend"],
    "backend": ["Backend"],
    "desktop": ["Desktop"],
    "검색": ["검색엔진"],
    "AI 서비스": ["AI"],
    "비동기 프로그래밍": ["Python", "비동기"],
    "기초": ["Python"],
}

# 카테고리 디렉토리 → 태그
CATEGORY_TAG_MAP = {
    "search-engine": "검색엔진",
    "ai": "AI",
    "devops": "DevOps",
    "full-stack": "Full Stack",
    "portfolio": "Portfolio",
}


def get_git_date(filepath):
    """git log에서 파일의 최초 커밋 날짜를 추출"""
    try:
        result = subprocess.run(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%aI", "--", filepath],
            capture_output=True, text=True, timeout=10
        )
        dates = result.stdout.strip().split("\n")
        if dates and dates[-1]:
            # 가장 오래된 날짜 (마지막 줄)
            date_str = dates[-1][:10]  # YYYY-MM-DD
            return date_str
    except Exception:
        pass

    # fallback: 가장 오래된 커밋
    try:
        result = subprocess.run(
            ["git", "log", "--follow", "--format=%aI", "--", filepath],
            capture_output=True, text=True, timeout=10
        )
        dates = result.stdout.strip().split("\n")
        if dates and dates[-1]:
            return dates[-1][:10]
    except Exception:
        pass

    return "2024-01-01"


def extract_title(content, filename):
    """본문에서 H1을 추출하거나 파일명에서 생성"""
    # frontmatter 제거 후 본문에서 찾기
    text = content
    if text.strip().startswith("---"):
        end = text.find("---", 3)
        if end > 0:
            text = text[end + 3:]

    # H1 찾기 (본문 첫 H1만)
    match = re.search(r"^#\s+(.+)$", text.strip(), re.MULTILINE)
    if match:
        title = match.group(1).strip()
        # 마크다운 링크 제거
        title = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", title)
        # H1 내용이 너무 짧거나 번호로 시작하면 (코드 제목 등) 파일명 우선
        if len(title) > 5 and not re.match(r"^\d+[\.\)]\s", title):
            return title

    # 파일명에서 추출
    name = os.path.splitext(filename)[0]
    # 넘버링 제거 (1. xxx, 2. xxx)
    name = re.sub(r"^\d+\.\s*", "", name)
    return name


def extract_description(content, title):
    """본문 첫 의미 있는 단락에서 description 추출 (최대 160자)"""
    # frontmatter 제거
    text = content
    if text.strip().startswith("---"):
        end = text.find("---", 3)
        if end > 0:
            text = text[end + 3:]

    # H1 제거
    text = re.sub(r"^#\s+.+$", "", text, count=1, flags=re.MULTILINE)

    # 코드 블록 제거
    text = re.sub(r"```[\s\S]*?```", "", text)

    # 이미지, 링크 정리
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    # HTML 태그 제거
    text = re.sub(r"<[^>]+>", "", text)

    # admonition 블록 제거
    text = re.sub(r"^!!!\s+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\?\?\?\s+.*$", "", text, flags=re.MULTILINE)

    # 빈 줄로 분리된 단락들 추출
    paragraphs = re.split(r"\n\s*\n", text.strip())

    for para in paragraphs:
        # 정리
        para = para.strip()
        # 헤딩, 리스트, 빈 줄 건너뛰기
        if not para or para.startswith("#") or para.startswith("-") or para.startswith("|"):
            continue
        # 마크다운 특수문자 정리
        para = re.sub(r"[*_`]", "", para)
        para = re.sub(r"\s+", " ", para).strip()

        if len(para) < 15:
            continue

        # 최대 160자로 자르기
        if len(para) > 160:
            # 문장 단위로 자르기
            sentences = re.split(r"[.!?。]\s*", para)
            desc = ""
            for s in sentences:
                if len(desc) + len(s) + 2 > 160:
                    break
                desc = desc + s + ". " if desc else s + ". "
            if desc:
                return desc.strip()
            return para[:157] + "..."

        return para

    # 단락을 못 찾으면 title 기반 description
    return f"{title}에 대한 기술 문서."


def infer_tags(filepath, title):
    """디렉토리 경로와 제목에서 태그 추론"""
    tags = set()

    # 디렉토리 경로에서 태그 추출
    parts = filepath.replace("docs/", "").split("/")

    # 카테고리 태그
    if parts[0] in CATEGORY_TAG_MAP:
        tags.add(CATEGORY_TAG_MAP[parts[0]])

    # 서브 디렉토리 태그
    for part in parts[:-1]:  # 파일명 제외
        if part in DIR_TAG_MAP:
            for tag in DIR_TAG_MAP[part]:
                tags.add(tag)

    # 제목에서 키워드 추출
    title_keywords = {
        "k-NN": "k-NN",
        "kNN": "k-NN",
        "벡터": "벡터 검색",
        "vector": "벡터 검색",
        "embedding": "임베딩",
        "임베딩": "임베딩",
        "GPU": "GPU",
        "Docker": "Docker",
        "docker-compose": "Docker",
        "LangChain": "LangChain",
        "LangGraph": "LangGraph",
        "Hybrid": "하이브리드 검색",
        "하이브리드": "하이브리드 검색",
        "Rerank": "Reranker",
        "RAG": "RAG",
        "PDF": "PDF",
        "Tauri": "Tauri",
        "NPU": "NPU",
        "RxDB": "RxDB",
        "vLLM": "vLLM",
        "SGLang": "SGLang",
        "LMDeploy": "LMDeploy",
        "BERT": "BERT",
        "GPT": "GPT",
        "Attention": "Transformer",
        "Transformer": "Transformer",
        "Tokenization": "Tokenization",
        "Dropout": "딥러닝",
        "Thompson": "강화학습",
        "Sampling": "강화학습",
        "비동기": "비동기",
        "async": "비동기",
        "multiprocessing": "멀티프로세싱",
        "MVC": "디자인 패턴",
        "FastEmbed": "FastEmbed",
        "Semantic": "시맨틱 검색",
    }

    for keyword, tag in title_keywords.items():
        if keyword.lower() in title.lower():
            tags.add(tag)

    # 최소 2개, 최대 6개
    tags = list(tags)
    if len(tags) > 6:
        tags = tags[:6]

    return tags


def has_complete_frontmatter(content):
    """frontmatter가 있고 date + description이 모두 있는지 확인"""
    if not content.strip().startswith("---"):
        return False
    end = content.find("---", 3)
    if end < 0:
        return False
    fm = content[3:end]
    return "date:" in fm and "description:" in fm


def should_skip(filepath):
    """건너뛸 파일인지 확인"""
    if filepath in EXCLUDE_FILES:
        return True
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, filepath):
            return True
    return False


def process_file(filepath, dry_run=False):
    """파일에 frontmatter 추가"""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if has_complete_frontmatter(content):
        return None

    filename = os.path.basename(filepath)
    title = extract_title(content, filename)
    date = get_git_date(filepath)
    description = extract_description(content, title)
    tags = infer_tags(filepath, title)

    # description에서 따옴표 이스케이프
    description = description.replace('"', '\\"')

    # tags YAML 생성
    tags_yaml = "\n".join(f"  - {tag}" for tag in tags)

    frontmatter = f'---\ntitle: "{title}"\ndescription: "{description}"\ndate: {date}\ntags:\n{tags_yaml}\n---\n'

    if content.strip().startswith("---"):
        # 기존 frontmatter가 있지만 불완전한 경우 → 교체
        end = content.find("---", 3)
        if end > 0:
            existing_fm = content[3:end].strip()
            # 기존 값 중 보존할 것 확인
            existing_title = re.search(r"title:\s*(.+)", existing_fm)
            existing_desc = re.search(r"description:\s*(.+)", existing_fm)
            existing_date = re.search(r"date:\s*(.+)", existing_fm)
            existing_tags = "tags:" in existing_fm

            if existing_title:
                title = existing_title.group(1).strip().strip('"').strip("'")
            if existing_desc:
                description = existing_desc.group(1).strip().strip('"').strip("'")
            if existing_date:
                date = existing_date.group(1).strip()

            # 기존 tags 보존
            if existing_tags:
                tag_matches = re.findall(r"-\s+(.+)", existing_fm[existing_fm.index("tags:"):])
                if tag_matches:
                    tags = [t.strip() for t in tag_matches]

            description = description.replace('"', '\\"')
            tags_yaml = "\n".join(f"  - {tag}" for tag in tags)
            frontmatter = f'---\ntitle: "{title}"\ndescription: "{description}"\ndate: {date}\ntags:\n{tags_yaml}\n---\n'

            new_content = frontmatter + content[end + 3:].lstrip("\n")
    else:
        # frontmatter가 없는 경우 → 맨 앞에 추가
        new_content = frontmatter + "\n" + content

    if dry_run:
        return {
            "file": filepath,
            "title": title,
            "date": date,
            "description": description[:80] + "..." if len(description) > 80 else description,
            "tags": tags,
        }

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    return {
        "file": filepath,
        "title": title,
        "date": date,
        "tags": tags,
    }


def main():
    dry_run = "--dry-run" in sys.argv

    targets = []
    for root, dirs, files in os.walk(DOCS_DIR):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if not f.endswith(".md"):
                continue
            filepath = os.path.join(root, f)
            if should_skip(filepath):
                continue
            with open(filepath, "r", encoding="utf-8") as fh:
                content = fh.read()
            if not has_complete_frontmatter(content):
                targets.append(filepath)

    targets.sort()
    print(f"{'[DRY RUN] ' if dry_run else ''}Processing {len(targets)} files...")

    results = []
    for filepath in targets:
        result = process_file(filepath, dry_run=dry_run)
        if result:
            results.append(result)
            status = "PREVIEW" if dry_run else "UPDATED"
            print(f"  [{status}] {result['file']}")
            print(f"    title: {result['title']}")
            print(f"    date: {result['date']}")
            print(f"    tags: {result['tags']}")
            if dry_run and "description" in result:
                print(f"    desc: {result['description']}")

    print(f"\n{'Would update' if dry_run else 'Updated'}: {len(results)} files")


if __name__ == "__main__":
    main()
