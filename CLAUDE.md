# SON BLOG - Claude Code 작업 지침

## 프로젝트 정보
- GitHub: https://github.com/SonAIengine/sonblog
- 배포: https://infoedu.co.kr/
- 플랫폼: MkDocs Material + GitHub Pages (main 푸시 → 자동 배포)
- Git: main 직접 push 가능

## 블로그 스타일 가이드

### 톤 & 말투
- **~다 체** 사용 ("구현했다", "적용했다", "해결했다")
- 이모지 사용 금지
- 간결하고 명확한 기술 문서 톤
- 실전 경험 기반, 1인칭 서술 ("이 프로젝트에서는", "당시 상황은")

### 구조
1. **개요** — 프로젝트 배경, 문제 정의
2. **아키텍처/설계** — 전체 구조, 기술 선택 이유 (다이어그램 포함)
3. **핵심 구현** — 주요 기능별 상세 설명 + 코드 (적당히)
4. **트러블슈팅** — 겪었던 문제와 해결 과정
5. **결과 및 회고** — 성과, 배운 점, 개선 방향

### 글 길이
- **10,000자 이상** 목표 (길게 작성)
- 깊이 있는 기술 설명 포함

### 코드 블록
- 적당히 사용 (핵심 로직 위주)
- 전체 코드 나열 금지, 중요한 부분만 발췌
- 언어 태그 필수 (```python, ```rust, ```typescript 등)

### 다이어그램
- Mermaid 다이어그램 적극 활용
- 아키텍처, 시퀀스, 플로우차트 등
- **디테일은 유지하되 색상은 심플하게** — 노드/서브그래프에 커스텀 색상(`style`, `fill`, `color`) 사용 금지
- Mermaid 기본 테마에 맡기고, 노드 텍스트로 의미를 전달 (`<br/>`로 부가 설명 가능)
- 서브그래프는 정말 필요할 때만 사용 (겹치거나 레이아웃 깨지면 플랫 구조로)
- `flowchart LR`(가로) 기본, 세로가 명확히 나을 때만 `TB` 사용

### MkDocs Material 메타데이터 (Frontmatter)

모든 블로그 글에 반드시 아래 형식의 YAML frontmatter를 작성한다. JSON-LD 구조화 데이터와 SEO 메타태그에 자동 반영되므로 **풍부하고 구체적으로** 작성할 것.

```yaml
---
title: "구체적이고 검색 가능한 제목"
description: "2~3문장으로 글의 핵심 내용, 기술 스택, 해결한 문제를 요약. 검색 결과에 노출되는 텍스트이므로 키워드를 자연스럽게 포함"
date: YYYY-MM-DD
tags:
  - 핵심기술1
  - 핵심기술2
  - 프레임워크명
  - 프로젝트명
---
```

#### 필드별 작성 기준

- **title**: 글의 핵심을 담은 구체적 제목. "~하기", "~구현기", "~비교" 등 명확한 의도 포함
  - 좋은 예: `"vLLM vs llama.cpp: 백엔드 스위칭 아키텍처 설계"`
  - 나쁜 예: `"모델 서빙 정리"`, `"백엔드 관련"`
- **description**: 2~3문장. 무엇을 했고, 어떤 기술을 사용했고, 어떤 결과/가치가 있는지 요약. Google 검색 결과의 스니펫으로 노출됨
  - 좋은 예: `"OpenSearch 결과를 Cross-Encoder Reranker로 재순위화하고, Redis 캐시와 비동기 처리로 응답 속도를 유지한 구현 과정을 정리한다."`
  - 나쁜 예: `"검색 개선에 대한 글"`
- **date**: 글 작성일 (YYYY-MM-DD)
- **tags**: 4~8개 권장. 기술명, 프레임워크명, 프로젝트명, 개념어를 혼합
  - 예: `[Rust, OpenSearch, 하이브리드 검색, NestJS, Reranker, XGEN]`

### 금지 사항
- 이모지/이모티콘 사용 절대 금지 (HTML 엔티티, 유니코드 이모지 포함)
- 마크다운 테이블 남용 금지
- 뻔한 서론/결론 금지 ("이번 포스트에서는~", "감사합니다")
- AI가 쓴 티 나는 표현 금지 ("살펴보겠습니다", "알아보겠습니다")

## 블로그 주제 발굴 워크플로우

사용자가 "블로그 글 써줘" 등 블로그 작성을 요청하면, 아래 절차로 주제를 발굴하고 제안한다.

### 1단계: 최신 커밋 조회 (GitLab + GitHub)

GitLab과 GitHub 모두에서 최근 커밋을 가져온다.

**GitLab** (회사 프로젝트):
```bash
# 프로젝트 ID 조회
curl --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlab.x2bee.com/api/v4/projects?search=프로젝트명"

# 최근 커밋 조회 (기본 최근 1~3개월, 사용자가 기간 지정 가능)
curl --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlab.x2bee.com/api/v4/projects/{ID}/repository/commits?per_page=100&since=시작일&until=종료일&author=sonsj97"
```

**GitHub** (개인 프로젝트):
```bash
# 사용자의 모든 레포 목록 조회
gh repo list SonAIengine --limit 50 --json name,pushedAt,description

# 특정 레포의 최근 커밋 조회
gh api repos/SonAIengine/{레포명}/commits --paginate -q '.[].commit | {message, date: .author.date}'

# 또는 날짜 필터링
gh api "repos/SonAIengine/{레포명}/commits?since=시작일&until=종료일&per_page=100"
```

조회 대상: GitLab은 아래 "GitLab 실제 작업 프로젝트" 섹션, GitHub은 SonAIengine 계정의 활성 레포.

### 2단계: 커밋 분석 및 주제 그룹핑

- 커밋 메시지를 분석하여 **주제별로 그룹핑**
- feat/fix/refactor 등 커밋 타입과 키워드로 의미 있는 작업 단위를 묶음
- 단순 typo fix, merge commit, version bump 등은 제외
- **시행착오 → 해결 패턴**이 있는 커밋 그룹이 블로그 소재로 가치가 높음

### 3단계: 중복 체크

- `docs/` 폴더의 기존 블로그 글 제목/내용과 비교
- 이미 작성된 주제는 제외하거나, 후속편/심화 글로 제안

### 4단계: 주제 제안 (3~5개)

각 주제를 아래 형식으로 제안:

```
**주제 N: [제목]**
- 프로젝트: [레포명]
- 기간: YYYY-MM-DD ~ YYYY-MM-DD
- 관련 커밋: N개 (주요 커밋 메시지 2~3개 인용)
- 카테고리: [search-engine / ai / devops / full-stack 등]
- 블로그 가치: [왜 이 주제가 글로 쓸 만한지 한 줄 설명]
```

### 5단계: 사용자 선택 → 글 작성

사용자가 주제를 선택하면:
1. 해당 주제 관련 커밋을 상세 조회 (diff, 파일 변경 내역)
2. GitLab API / GitHub API(`gh`) 또는 로컬 클론으로 실제 소스코드 읽기
3. 블로그 스타일 가이드에 따라 글 작성

## 카테고리 구조

| 카테고리 | 폴더 경로 | 성격 |
|----------|-----------|------|
| 검색 엔진 / AI Search | `docs/search-engine/` | OpenSearch, Qdrant, NestJS/Rust 검색 엔진, RAG |
| AI/ML & LLM | `docs/ai/` | 모델 서빙, 임베딩, 파인튜닝, Agent, XGEN 플랫폼 |
| DevOps / 인프라 | `docs/devops/` | K8s, ArgoCD, Jenkins, Docker 등 **전문 인프라/클라우드 경험** |
| Full Stack | `docs/full-stack/` | Frontend, Backend, Desktop, Python, **PoC/블로그 기능 개발** |

### 카테고리 분류 기준
- **devops/infra**: Kubernetes, 클라우드, CI/CD 등 전문 인프라 지식/경험 위주
- **full-stack/poc**: 블로그 자체 기능(SEO, Knowledge Graph, 검색 등) 개발/설정은 여기에

## 접속 정보

접속 정보(토큰, 비밀번호)는 글로벌 ~/.claude/CLAUDE.md에서 관리 (git에 시크릿 포함 금지)

## GitLab 실제 작업 프로젝트 (push 이력 기반)

블로그 글 작성 시 실제 코드를 참조해야 할 프로젝트 목록.

### 핵심 프로젝트 (50+ pushes)
- xgen2.0/xgen-infra (522) — K8s/ArgoCD 인프라, Jenkins, Dockerfile
- tech-team/ai-team/search/x2bee-nest-search (318) — NestJS 검색엔진
- xgen2.0/xgen-frontend (275) — XGEN 2.0 프론트엔드 (Next.js)
- tech-team/polar/open-webui (236) — AI 모델 서빙 WebUI
- tech-team/ai-team/search/search-semantic-api (227) — 시맨틱 검색 API (Python)
- xgen/xgen-infra (185) — XGEN 1.0 인프라
- tech-team/experience-zone/ai-experience-zone (158) — AI 체험존
- solution-project/aurora-project/aurora-x2bee-api-search (145) — 오로라 검색 API
- tech-team/ai-team/search/persona-recommand (123) — 페르소나 추천
- xgen/xgen-frontend (119) — XGEN 1.0 프론트엔드
- moon-project/moon-x2bee-api-search-vanilla (119) — Moon 검색 API
- xgen2.0/xgen-model (80) — LLM/임베딩 모델 서빙
- tech-team/ai-team/code-assistant-project/assistant-ui-next (75) — Code Assistant UI
- moon-project/moon-x2bee-api-ai-vanilla (74) — Moon AI API
- xgen/xgen-backend-gateway (73) — XGEN 1.0 게이트웨이
- tech-team/ai-team/search/search-rust (69) — Rust 검색엔진
- xgen/xgen-workflow (66) — XGEN 1.0 워크플로우
- tech-team/ai-team/demand-forecasting-api (62) — 수요예측 API
- xgen2.0/xgen-workflow (55) — XGEN 2.0 워크플로우

### 중간 프로젝트 (10~49 pushes)
- xgen2.0/xgen-app (49) — Tauri 데스크톱 앱
- tech-team/polar/polar-trainer (49) — 모델 학습
- tech-team/polar/polar-comfyui (34) — ComfyUI
- xgen2.0/xgen-backend-gateway (33) — Rust API Gateway
- tech-team/ai-team/dumy/chatbot-ui-next (32) — 챗봇 UI
- xgen2.0/xgen-core (31) — XGEN 2.0 코어
- tech-team/polar/vllm-script (31) — vLLM 스크립트
- moon-project/moon-x2bee-api-goods-vanilla (28) — 상품 API
- xgen2.0/xgen-documents (15) — 문서 처리 서비스
- xgen/xgen-retrieval (12) — RAG/벡터DB 서비스

### 로컬 참조 경로
- XGEN 인프라: /home/son/xgen-infra
- GitLab 그룹: https://gitlab.x2bee.com/xgen2.0
