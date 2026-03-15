#!/usr/bin/env python3
"""SEO URL slug migration for sonblog.

한글/공백/특수문자 파일명을 영문 lowercase slug로 일괄 변환한다.
디렉토리 rename, 파일 rename, .pages 업데이트, 내부 링크 치환, redirect 맵 생성.

Usage:
    python scripts/seo_migrate.py generate   # slug_mapping.json 생성 (리뷰용)
    python scripts/seo_migrate.py migrate    # 매핑 기반 마이그레이션 실행
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

DOCS_DIR = Path("docs")
MAPPING_FILE = Path("scripts/slug_mapping.json")
REDIRECT_FILE = Path("scripts/redirect_mapping.json")

# ── 디렉토리 매핑 (docs/ 기준 상대경로) ──────────────────────────────────────

DIR_MAPPING = {
    "ai/파인튜닝": "ai/fine-tuning",
    "ai/딥러닝 기초": "ai/deep-learning",
    "ai/Model Serve": "ai/model-serve",
    "full-stack/python/기초": "full-stack/python/basics",
    "full-stack/python/비동기 프로그래밍": "full-stack/python/async",
    "portfolio/검색": "portfolio/search",
    "portfolio/AI 서비스": "portfolio/ai-service",
    "search-engine/시맨틱 검색": "search-engine/semantic-search",
    "search-engine/NestJS 검색 엔진": "search-engine/nestjs-search",
    "search-engine/Rust 검색 엔진": "search-engine/rust-search",
}

# ── 한글 → 영문 변환 사전 ────────────────────────────────────────────────────
# 파일명에 등장하는 한글을 영문으로 치환한다.
# 긴 단어부터 먼저 매칭하도록 사용 시 정렬 필요.

KOREAN_TO_ENGLISH = {
    # 외래어 (영어 → 한글 → 다시 영어) — 긴 단어 우선 매칭 중요
    "마이크로서비스": "microservice", "아키텍처": "architecture",
    "레포지토리": "repository", "마이그레이션": "migration",
    "페이지네이션": "pagination", "컨테이너화": "containerization",
    "라이프사이클": "lifecycle", "네비게이션": "navigation",
    "온프레미스": "on-premise", "에이전트": "agent",
    "어시스턴트": "assistant", "가이드라인": "guideline",
    "코드베이스": "codebase", "오프로딩": "offloading",
    "프론트엔드": "frontend", "리팩토링": "refactoring",
    "스크롤바": "scrollbar", "클라이언트": "client",
    "파이프라인": "pipeline", "모니터링": "monitoring",
    "오픈서치": "opensearch", "브라우저": "browser",
    "시나리오": "scenario", "레코더": "recorder",
    "셀렉터": "selector", "스토리지": "storage",
    "메시지": "message", "피드백": "feedback",
    "디자인": "design", "타임아웃": "timeout",
    "스트리밍": "streaming", "싱글턴": "singleton",
    "컬렉션": "collection", "프로필": "profile",
    "커스텀": "custom", "하이브리드": "hybrid",
    "터널링": "tunneling", "프록시": "proxy",
    "에디터": "editor", "대시보드": "dashboard",
    "레이아웃": "layout", "컴포넌트": "component",
    "데스크톱": "desktop", "백엔드": "backend",
    "워크플로우": "workflow", "템플릿": "template",
    "인덱싱": "indexing", "인덱스": "index",
    "캐싱": "caching", "토큰": "token",
    "시맨틱": "semantic", "벡터": "vector",
    "모달": "modal", "스냅핑": "snapping",
    "라우팅": "routing", "패턴": "pattern",
    "카테고리": "category", "필터링": "filtering",
    "스코어링": "scoring", "랭킹": "ranking",
    "리소스": "resource", "스크립트": "script",
    "클러스터": "cluster", "임베딩": "embedding",
    "청킹": "chunking", "테스터": "tester",
    "커서": "cursor", "플랫폼": "platform",
    "인프라": "infra", "노드": "node",
    "레이어": "layer", "모듈": "module",
    "로컬": "local", "멀티": "multi",
    "배치": "batch", "소셜": "social",
    "텍스트": "text", "이미지": "image",
    "그래프": "graph", "커머스": "commerce",
    "데이터셋": "dataset", "데이터": "data",
    "파싱": "parsing", "패키지": "package",
    "루프": "loop", "코딩": "coding",
    "리포트": "report", "챗봇": "chatbot",
    "로직": "logic", "리뷰": "review",
    "피팅": "fitting", "플로우": "flow",
    "트리": "tree", "가이드": "guide",
    "스케줄러": "scheduler", "매니저": "manager",
    "비주얼": "visual", "터널": "tunnel",
    "컨텍스트": "context", "윈도우": "window",
    "서빙": "serving", "벤더": "vendor",
    "엑셀": "excel", "액션": "action",
    "배지": "badge", "페이지": "page",
    "레코드": "record", "알림": "notification",
    "히스토리": "history", "테스트": "test",
    "챌린지": "challenge", "형태소": "morpheme",
    "서비스": "service", "시스템": "system",
    "엔진": "engine", "서버": "server",
    "모델": "model", "채팅": "chat",
    "인증": "auth", "프로세서": "processor",
    "가상": "virtual", "리버스": "reverse",
    "디바이스": "device", "스위칭": "switching",
    "파라미터": "parameter", "샘플링": "sampling",
    "클라우드": "cloud", "컨테이너": "container",
    "엣지": "edge", "튜닝": "tuning",
    "크롤러": "crawler", "세션": "session",
    "메커니즘": "mechanism", "스테이션": "station",
    "캐시": "cache", "앱": "app",
    "모드": "mode", "사이트": "site",
    "풀": "pool", "큐": "queue",
    "탭": "tab", "드래그": "drag",
    "드롭": "drop", "포트": "port",

    # 순한글 기술 용어
    "자동화": "automation", "자동": "auto",
    "최적화": "optimization", "최적": "optimal",
    "검색": "search", "검증": "validation",
    "배포": "deploy", "설정": "config",
    "구현기": "impl", "구현": "impl",
    "설계": "design", "구축기": "setup",
    "구축": "setup", "구성기": "compose",
    "구성": "compose", "운영기": "ops-story",
    "운영": "ops", "개발기": "dev-story",
    "개발": "dev", "적용기": "adoption",
    "적용": "apply", "삽질기": "troubleshoot",
    "삽질": "troubleshoot", "해결기": "fix-story",
    "해결": "fix", "관리": "management",
    "처리": "processing", "통합": "integration",
    "연동": "integration", "전략": "strategy",
    "비교": "comparison", "분석": "analysis",
    "성능": "performance", "보안": "security",
    "강화": "hardening", "상태": "status",
    "실시간": "realtime", "실행": "execution",
    "취소": "cancel", "생성": "generate",
    "추출": "extraction", "감지": "detection",
    "전환": "switching", "조정": "adjust",
    "동적": "dynamic", "분산": "distributed",
    "직렬화": "serialization", "추상화": "abstraction",
    "의존": "dependency", "제거": "removal",
    "교체": "replacement", "갱신": "renewal",
    "등록": "register", "확인": "verify",
    "삭제": "delete", "치환": "replace",
    "연산": "operation", "공유": "share",
    "권한": "permission", "내보내기": "export",
    "통계": "stats", "진행률": "progress",
    "업로드": "upload", "다운로드": "download",
    "로그인": "login", "접속": "access",
    "접근": "access", "유지하기": "keep",
    "유지": "keep", "만들기": "build",
    "다루기": "handling", "다루는": "handle",
    "달성하기": "achieve", "돌리기": "run",
    "올리기": "setup", "전달하기": "deliver",
    "향상하기": "improve", "개선하기": "improve",
    "시작": "start",

    "문서": "document", "파일": "file",
    "사용자": "user", "고객사": "client-site",
    "상품": "product", "요약": "summary",
    "결과": "result", "원인": "cause",
    "목적": "purpose", "기능": "feature",
    "품질": "quality", "정확도": "accuracy",
    "안정성": "stability", "속도": "speed",
    "개선": "improve", "가치": "value",
    "방식": "method", "수준": "level",

    "기반": "based", "환경": "env",
    "단일": "single", "이중": "dual",
    "대규모": "large-scale", "원격": "remote",
    "차세대": "next-gen", "폐쇄망": "airgap",
    "범용": "generic", "동시": "concurrent",
    "실전": "practical", "신규": "new",

    "녹화": "recording", "재생": "replay",
    "행동": "behavior", "개입": "intervention",
    "지점": "point", "생존": "survival",
    "우선": "priority", "강제": "force",
    "표시": "display", "정리": "organize",
    "반복": "repeat", "작업": "task",
    "도구": "tool", "즉각": "immediate",
    "사람": "human",
    "까다로운": "tricky", "문제": "problem",
    "확보": "ensure", "대체": "alternative",
    "로드": "load", "언로드": "unload",
    "활성화": "activation", "선택": "selection",

    "옵션": "option", "전처리": "preprocessing",
    "호환": "compatible", "직접": "direct",

    "사양": "spec", "설치": "install",
    "부하": "load-test", "사전": "dictionary",
    "유사도": "similarity", "계산": "calculation",
    "체크": "check", "차지": "occupy",
    "의도": "intent", "키워드": "keyword",
    "재순위화": "reranking", "임계값": "threshold",
    "색상": "color", "성별": "gender",

    "대화": "conversation", "기록": "history",
    "일관된": "consistent", "고도화": "advanced",
    "활용처": "use-cases", "시행착오": "trial-error",
    "진입점": "entry-point", "현황": "status",

    "구조": "structure", "재편성": "restructure",
    "디렉토리": "directory", "도메인": "domain",
    "인증서": "certificate", "네임서버": "nameserver",
    "충돌": "conflict", "실패": "failure",
    "발급": "issuance", "이야기": "story",

    "사례": "case", "이란": "intro",
    "업무": "work", "지식": "knowledge",
    "베이스": "base", "수집": "collect",

    "홈서버": "homeserver", "빌드": "build",
    "롯데홈쇼핑": "lotteshopping",

    # 2글자 이상 조사/접속사만 (1글자 조사는 너무 공격적이라 제거)
    "에서의": "", "에서": "", "으로": "",
    "부터": "", "까지": "",
}


def _sorted_dict():
    """긴 키부터 먼저 매칭하도록 정렬된 사전 반환."""
    return sorted(KOREAN_TO_ENGLISH.items(), key=lambda x: -len(x[0]))


def needs_rename(filename: str) -> bool:
    """파일명에 비ASCII 문자, 공백, 또는 대문자가 포함되어 있으면 True."""
    if filename in ("index.md", "tags.md", "graph.md", ".pages", "draft.md"):
        return False
    stem = filename.replace(".md", "")
    # 비ASCII 문자
    if re.search(r'[^\x00-\x7F]', stem):
        return True
    # 공백
    if " " in stem:
        return True
    # 대문자 (SEO용 lowercase 통일)
    if stem != stem.lower():
        return True
    # 괄호 등 특수문자
    if re.search(r'[()]', stem):
        return True
    return False


def generate_slug(stem: str) -> str:
    """한글/혼합 파일명에서 영문 slug를 생성한다."""
    text = stem

    # 1. 한글→영문 치환 (긴 단어 우선)
    for ko, en in _sorted_dict():
        text = text.replace(ko, en if not en else f"-{en}-")

    # 2. 남은 한글 제거
    text = re.sub(r'[가-힣ㄱ-ㅎㅏ-ㅣ]+', '', text)

    # 3. 정규화
    text = text.lower()
    text = re.sub(r'[^a-z0-9\-]', '-', text)
    text = re.sub(r'-+', '-', text)
    text = text.strip('-')

    return text


def parse_title(filepath: Path) -> str:
    """frontmatter에서 title을 추출한다."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return ""
    if not content.startswith("---"):
        return ""
    end = content.find("---", 3)
    if end == -1:
        return ""
    fm = content[3:end]
    m = re.search(r'^title:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
    return m.group(1).strip() if m else ""


def apply_dir_mapping(rel_path: str) -> str:
    """디렉토리 매핑을 경로에 적용한다."""
    for old_dir, new_dir in DIR_MAPPING.items():
        if rel_path.startswith(old_dir + "/"):
            return new_dir + rel_path[len(old_dir):]
        if rel_path == old_dir:
            return new_dir
    return rel_path


def generate_slug_mapping():
    """docs/를 스캔하여 slug_mapping.json을 생성한다."""
    file_mapping = {}   # old_rel_path → new_rel_path (docs/ 기준)
    dir_used = {}       # 중복 slug 방지용

    exclude_dirs = {"blog", "assets", "notes"}
    exclude_files = {"index.md", "tags.md", "graph.md", ".pages", "draft.md"}

    for root, dirs, files in os.walk(DOCS_DIR):
        dirs[:] = sorted(d for d in dirs if not d.startswith(".") and d not in exclude_dirs)

        for fname in sorted(files):
            if fname in exclude_files or not fname.endswith(".md"):
                continue

            fpath = Path(root) / fname
            rel_path = fpath.relative_to(DOCS_DIR).as_posix()

            # 디렉토리 매핑 적용
            new_rel_path = apply_dir_mapping(rel_path)

            # 파일명 처리
            dir_part = str(Path(new_rel_path).parent)
            fname_part = Path(new_rel_path).name

            if needs_rename(fname_part):
                stem = fname_part.replace(".md", "")
                new_stem = generate_slug(stem)

                # slug가 너무 짧으면 title에서 보강
                if len(new_stem) < 5:
                    title = parse_title(fpath)
                    if title:
                        title_slug = generate_slug(title)
                        if len(title_slug) > len(new_stem):
                            new_stem = title_slug

                # 빈 slug 방지
                if not new_stem:
                    new_stem = stem.lower().replace(" ", "-")

                # 디렉토리 내 중복 방지
                base_stem = new_stem
                counter = 1
                while (dir_part, new_stem) in dir_used:
                    counter += 1
                    new_stem = f"{base_stem}-{counter}"
                dir_used[(dir_part, new_stem)] = True

                new_fname = new_stem + ".md"
                new_rel_path = f"{dir_part}/{new_fname}" if dir_part != "." else new_fname
            else:
                # 파일명은 그대로, 디렉토리만 변경된 경우
                if new_rel_path == rel_path:
                    continue  # 변경 없음

            file_mapping[rel_path] = new_rel_path

    result = {
        "dir_mapping": DIR_MAPPING,
        "file_mapping": file_mapping,
    }

    MAPPING_FILE.parent.mkdir(parents=True, exist_ok=True)
    MAPPING_FILE.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Generated {MAPPING_FILE}")
    print(f"  Directories: {len(DIR_MAPPING)}")
    print(f"  Files: {len(file_mapping)}")
    print()

    # 결과 미리보기
    for old, new in sorted(file_mapping.items()):
        changed = " <-- DIR+FILE" if Path(old).parent.as_posix() != Path(new).parent.as_posix() and Path(old).name != Path(new).name else ""
        print(f"  {old}")
        print(f"    → {new}{changed}")
        print()


def execute_migration():
    """slug_mapping.json을 읽고 마이그레이션을 실행한다."""
    if not MAPPING_FILE.exists():
        print(f"Error: {MAPPING_FILE} not found. Run 'generate' first.")
        sys.exit(1)

    mapping = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    dir_mapping = mapping["dir_mapping"]
    file_mapping = mapping["file_mapping"]

    # docs/ 기준 → 실제 경로
    def docs_path(rel: str) -> Path:
        return DOCS_DIR / rel

    # ── 1. 디렉토리 rename ──────────────────────────────────────────────────
    # 깊은 경로부터 처리 (자식 → 부모 순서)
    sorted_dirs = sorted(dir_mapping.items(), key=lambda x: -x[0].count("/"))
    for old_dir, new_dir in sorted_dirs:
        old_path = docs_path(old_dir)
        new_path = docs_path(new_dir)
        if old_path.exists():
            new_path.parent.mkdir(parents=True, exist_ok=True)
            print(f"  git mv '{old_path}' '{new_path}'")
            subprocess.run(
                ["git", "mv", str(old_path), str(new_path)],
                check=True,
            )
        else:
            print(f"  SKIP (not found): {old_path}")

    # ── 2. 파일 rename ──────────────────────────────────────────────────────
    for old_rel, new_rel in sorted(file_mapping.items()):
        # 디렉토리가 이미 변경되었을 수 있으므로, 경로 보정
        actual_old_rel = apply_dir_mapping(old_rel)
        old_path = docs_path(actual_old_rel)
        new_path = docs_path(new_rel)

        if old_path == new_path:
            continue  # 디렉토리만 변경된 경우, 이미 git mv로 처리됨

        # 파일명만 다른 경우
        if old_path.parent == new_path.parent and old_path.name != new_path.name:
            if old_path.exists():
                print(f"  git mv '{old_path.name}' → '{new_path.name}'")
                subprocess.run(
                    ["git", "mv", str(old_path), str(new_path)],
                    check=True,
                )
            else:
                print(f"  SKIP (not found): {old_path}")

    # ── 3. .pages 파일 업데이트 ──────────────────────────────────────────────
    update_pages_files(dir_mapping, file_mapping)

    # ── 4. 내부 링크 업데이트 ────────────────────────────────────────────────
    update_internal_links(file_mapping, dir_mapping)

    # ── 5. redirect_mapping.json 생성 ────────────────────────────────────────
    generate_redirect_map(file_mapping, dir_mapping)

    print(f"\nMigration complete.")
    print(f"  Redirect mapping: {REDIRECT_FILE}")


def update_pages_files(dir_mapping: dict, file_mapping: dict):
    """모든 .pages 파일에서 파일명/디렉토리명 참조를 업데이트한다."""
    # 파일명 치환 맵 (old_filename → new_filename, 같은 디렉토리 내)
    fname_map = {}
    for old_rel, new_rel in file_mapping.items():
        old_name = Path(old_rel).name
        new_name = Path(new_rel).name
        if old_name != new_name:
            fname_map[old_name] = new_name

    # 디렉토리명 치환 맵 (마지막 segment만)
    dirname_map = {}
    for old_dir, new_dir in dir_mapping.items():
        old_last = old_dir.split("/")[-1]
        new_last = new_dir.split("/")[-1]
        if old_last != new_last:
            dirname_map[old_last] = new_last

    # 모든 .pages 파일 찾기
    pages_files = list(DOCS_DIR.rglob(".pages"))
    for pf in pages_files:
        try:
            content = pf.read_text(encoding="utf-8")
        except Exception:
            continue

        original = content

        # 디렉토리명 치환 (nav에서 디렉토리 참조)
        for old_name, new_name in dirname_map.items():
            # "  - 파인튜닝" → "  - fine-tuning"
            # "  - Model Serve" → "  - model-serve"
            # "  - AI Agent: agent" 같은 패턴은 영향 없음
            content = content.replace(f"  - {old_name}\n", f"  - {new_name}\n")
            content = content.replace(f"  - {old_name}", f"  - {new_name}")
            # "title: ..." 형태로 참조된 경우도
            # nav에서 "Label: dirname" 패턴
            # 예: "  - LLM 서빙 비교: model-serve" — 이건 이미 new_name

        # 파일명 치환 (nav에서 파일 참조)
        for old_name, new_name in fname_map.items():
            content = content.replace(old_name, new_name)

        if content != original:
            pf.write_text(content, encoding="utf-8")
            print(f"  Updated .pages: {pf}")


def update_internal_links(file_mapping: dict, dir_mapping: dict):
    """모든 .md 파일에서 내부 링크와 frontmatter 경로를 업데이트한다."""
    # 전체 경로 치환 맵 (docs/ 기준 상대경로)
    path_map = {}
    for old_rel, new_rel in file_mapping.items():
        path_map[old_rel] = new_rel

    # 디렉토리 변경에 의해 영향받는 경로도 포함
    # (file_mapping에 없지만 디렉토리만 바뀐 파일들)

    # 파일명만의 치환 맵 (같은 디렉토리 내 상대 링크용)
    fname_only_map = {}
    for old_rel, new_rel in file_mapping.items():
        old_name = Path(old_rel).name
        new_name = Path(new_rel).name
        if old_name != new_name:
            fname_only_map[old_name] = new_name

    # 모든 .md 파일 스캔
    md_files = list(DOCS_DIR.rglob("*.md"))
    for md_file in md_files:
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        original = content

        # frontmatter related/depends_on 경로 업데이트
        # 형식: "  - ai/XGEN/old-file.md"
        for old_rel, new_rel in path_map.items():
            content = content.replace(old_rel, new_rel)

        # 마크다운 링크에서 같은 디렉토리 상대 참조
        # 형식: ](./old-file.md) 또는 ](old-file.md)
        for old_name, new_name in fname_only_map.items():
            # ](./old-file.md) → ](./new-file.md)
            content = content.replace(f"](./{old_name})", f"](./{new_name})")
            # ](old-file.md) → ](new-file.md)
            content = content.replace(f"]({old_name})", f"]({new_name})")
            # .pages nav 참조
            content = content.replace(f"  - {old_name}", f"  - {new_name}")

        if content != original:
            md_file.write_text(content, encoding="utf-8")
            print(f"  Updated links: {md_file}")


def generate_redirect_map(file_mapping: dict, dir_mapping: dict):
    """기존 URL → 새 URL redirect 매핑을 생성한다."""
    redirects = {}

    for old_rel, new_rel in file_mapping.items():
        # .md → / (MkDocs URL 변환)
        old_url = old_rel.replace(".md", "/")
        new_url = new_rel.replace(".md", "/")
        if old_url != new_url:
            redirects[old_rel] = new_rel

    # 디렉토리 변경에 의한 index.md 리다이렉트
    for old_dir, new_dir in dir_mapping.items():
        old_idx = f"{old_dir}/index.md"
        new_idx = f"{new_dir}/index.md"
        # index.md가 존재할 수 있음
        if old_idx not in redirects:
            redirects[old_idx] = new_idx

    REDIRECT_FILE.write_text(
        json.dumps(redirects, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  Generated redirect mapping: {len(redirects)} entries → {REDIRECT_FILE}")


def main():
    if len(sys.argv) < 2:
        print("Usage: seo_migrate.py [generate|migrate]")
        print("  generate  — slug_mapping.json 생성 (리뷰용)")
        print("  migrate   — 매핑 기반 마이그레이션 실행")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "generate":
        generate_slug_mapping()
    elif cmd == "migrate":
        execute_migration()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
