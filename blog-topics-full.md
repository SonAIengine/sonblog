# 블로그 주제 전체 목록 (GitLab 커밋 기반)

> 분석 기간: 2024.01 ~ 2026.02
> 총 커밋 수: 3,016개 (34개 레포지토리)
> 생성일: 2026-02-10

---

## 카테고리별 분류

### 🔍 검색 엔진 / AI Search (25개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 1 | Rust로 커머스 검색 엔진을 처음부터 만들기 | 2025.03 | search-rust | project init, search_rust, README |
| 2 | Actix-web + OpenSearch: Rust 검색 API 아키텍처 설계 | 2025.03 | search-rust | indexing, search routes, models |
| 3 | PostgreSQL과 MySQL 동시 지원하는 Rust DB 추상화 레이어 구현 | 2025.06 | search-rust | MySQL/PostgreSQL, refactor database |
| 4 | Rust 검색 엔진에 Redis 캐싱 적용기 | 2025.06 | search-rust | Redis caching support |
| 5 | OpenSearch 인덱싱 서비스: 스트리밍 vs 배치 처리 비교 | 2025.06 | search-rust | batch processing, streaming support |
| 6 | Rust 검색 엔진에서 SSH 터널링으로 원격 DB 접근하기 | 2025.04 | search-rust | SSH, synonym features |
| 7 | OpenSearch Aggregation 검색 구현 및 에러 핸들링 전략 | 2025.04 | search-rust | aggregation support, error handling |
| 8 | 커머스 상품 추천 검색 API 설계 (goods + marketing) | 2025.05 | search-rust | recommendation search, marketing |
| 9 | Rust 검색 엔진의 CI/CD 파이프라인 구축 (GitLab + EC2) | 2025.04 | search-rust | gitlab-ci, SCP transfer, pipeline |
| 10 | OpenSearch 동의어(Synonym) 사전 관리 자동화 | 2025.04-06 | search-rust | synonym handling, user dictionary |
| 11 | Handlebars 템플릿으로 동적 검색 쿼리 생성하기 | 2025.04 | search-rust | Handlebars, once_cell |
| 12 | 커서 기반 인덱싱 vs 전체 인덱싱: 성능 비교 | 2025.04-06 | search-rust | cursor-based indexing |
| 13 | Rate Limiting이 적용된 검색 API 설계 | 2025.04 | search-rust | rate limit configuration |
| 14 | NestJS 기반 이커머스 검색 엔진 개발기 (x2bee-nest-search) | 2024.07-2025.09 | x2bee-nest-search | 검색 품질, 가중치, 쿼리 |
| 15 | 시맨틱 검색과 키워드 검색의 하이브리드 전략 | 2024.08-2024.12 | x2bee-nest-search | 시맨틱, keyword, 텍스트 분리 |
| 16 | GPT를 활용한 검색 쿼리 의도 분석 및 키워드 추출 | 2024.11-2024.12 | x2bee-nest-search | gpt, 형태소분리, 토큰화 |
| 17 | 검색 품질 개선: 성별/색상/카테고리 필터링 최적화 | 2024.11-2025.01 | x2bee-nest-search | 성별 가중치, 색상, 카테고리 |
| 18 | 벡터 검색 유사도 임계값 동적 조정 (토큰 수 기반) | 2024.12 | x2bee-nest-search | 벡터 검색, 유사도 컷, token |
| 19 | Reranker 모델 도입으로 검색 정확도 향상하기 | 2025.01 | x2bee-nest-search | reranker, redis |
| 20 | FAISS 벡터 인덱스 적용과 GPU 디바이스 최적화 | 2024.11 | search-semantic-api | faiss, device, 유사도 |
| 21 | 시맨틱 검색 API: 요약(Summary) 기능 온/오프 전략 | 2024.11-12 | search-semantic-api | summary on/off, workers |
| 22 | OpenSearch Nori 분석기 커스터마이징 및 형태소 분석 | 2024.08-09 | x2bee-nest-search | nori_analyzer, stoptags |
| 23 | 이미지 기반 상품 검색 구현기 | 2024.07-08 | x2bee-nest-search | search-image, 이미지 검색 |
| 24 | 검색 결과 랭킹 스코어링 시스템 설계 | 2024.08-2025.04 | x2bee-nest-search, search-rust | 랭킹점수, ranking indexing |
| 25 | Cosine Similarity 직접 구현으로 검색 재순위화 | 2025.03 | x2bee-nest-search | cosine similarity calculation |

### 🤖 AI/ML & LLM (20개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 26 | llama.cpp 서버 운영기: ROCm GPU에서의 삽질과 해결 | 2026.01 | xgen-model | ROCm, GPU page fault, llama-server |
| 27 | AMD GPU에서 LLM 돌리기: Vulkan vs ROCm 비교 | 2026.01 | xgen-model | Vulkan 최적화, ROCm, mlock |
| 28 | 멀티 GPU LLM 배포: GPU 선택 및 레이어 오프로딩 전략 | 2026.01 | xgen-model | 멀티 GPU, n_gpu_layers, CPU offload |
| 29 | vLLM vs llama.cpp: 백엔드 스위칭 아키텍처 설계 | 2026.01 | xgen-model | switch-backend, model_type |
| 30 | OpenAI 호환 API 서버 직접 만들기 (stream_generate) | 2026.01 | xgen-model | OpenAI 호환 API, stream |
| 31 | 로컬 LLM 모델 관리 시스템: 로드/언로드/활성화 라이프사이클 | 2026.01 | xgen-model | auto activate, lifecycle, loading_status |
| 32 | Embedding 모델 서빙: batch size 최적화로 긴 문서 처리 | 2026.01 | xgen-model | batch size 512→2048, embedding |
| 33 | HuggingFace 모델 검색 및 다운로드 자동화 | 2025.09-12 | xgen-app, xgen-frontend | HuggingFace, model search, metadata |
| 34 | Late Chunking과 Sparse Embedding: 차세대 검색 파이프라인 | 2026.01 | xgen-workflow | Late Chunking, Sparse Embedding |
| 35 | Iterative RAG 검색 엔진 구현: 반복적 질의 개선 전략 | 2025.12-2026.01 | xgen-workflow | IterativeSearchEngine, vectordb_retrieval |
| 36 | Qdrant 하이브리드 검색: Sparse + Dense 벡터 통합 | 2025.12 | xgen-workflow, xgen-retrieval | sparse vector, hybrid search, query_points |
| 37 | RAG 서비스의 토큰 관리와 컨텍스트 윈도우 최적화 | 2025.12 | xgen-workflow | token management, context limitations |
| 38 | 워크플로우 실행 메모리 최적화: SearchCache 싱글턴 풀 패턴 | 2025.12 | xgen-workflow | memory optimization, singleton pools |
| 39 | SSE 스트리밍으로 대규모 배치 워크플로우 결과 전달하기 | 2025.12 | xgen-workflow | SSE batch, streaming, cancellation |
| 40 | 문서 임베딩 파이프라인: 청킹 옵션과 전처리 전략 | 2025.12 | xgen-retrieval | advanced chunking, document processing |
| 41 | 벡터DB 컬렉션 문서 요약 및 페이지네이션 API 설계 | 2025.12 | xgen-retrieval | documents summary, pagination |
| 42 | Sparse Vector와 Full-Text Index 하이브리드 검색 구현 | 2025.12 | xgen-retrieval | sparse vector, full-text index |
| 43 | CustomHTTPEmbedding 클라이언트: 타임아웃과 배치 처리 | 2025.12-2026.01 | xgen-embedding | timeout, batch size, refactor |
| 44 | vLLM 모델 배포: 샘플링 파라미터 튜닝 가이드 | 2025.12 | xgen-frontend | sampling parameters, vLLM config |
| 45 | GPU 상태 모니터링 및 자동 모델 배포 시스템 | 2025.12 | xgen-frontend | GPU status, testing, memory check |

### 🤖 AI Agent / 브라우저 자동화 (15개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 46 | AI Agent 기반 브라우저 자동화 시스템 구축기 | 2026.02 | xgen-app | Agent 대폭 개선, Playwright MCP |
| 47 | Claude Code 수준의 Agent 정확도 달성하기: 12대 개선사항 | 2026.02 | xgen-app | 실사이트 테스트, 12대 개선사항 |
| 48 | MCP(Model Context Protocol)로 Agent 속도 3-5x 개선 | 2026.02 | xgen-app | MCP 호출 축소, Claude Code 수준 |
| 49 | Human-in-the-Loop: AI Agent에 사람 개입 지점 설계하기 | 2026.02 | xgen-app, xgen-frontend | human-in-the-loop, 일시정지, MAX_ROUNDS |
| 50 | 시나리오 레코더: 사용자 행동 녹화 및 재생 엔진 | 2026.02 | xgen-app, xgen-frontend | scenario-recorder, recording, playback |
| 51 | 브라우저 자동화 시 페이지 네비게이션 생존 전략 | 2026.02 | xgen-app | survive navigation, persist events |
| 52 | CSS 셀렉터 대체 전략: selector_alternatives로 안정성 확보 | 2026.02 | xgen-frontend | selector_alternatives, fallback |
| 53 | 엑셀 루프 자동화: Agent + 스토리지 연동으로 반복 작업 처리 | 2026.02 | xgen-frontend | Excel Controller, 엑셀 루프, 자동 매핑 |
| 54 | Agent 실시간 상태 바: 메시지 큐와 즉각 피드백 UX | 2026.02 | xgen-frontend | live status bar, message queue |
| 55 | Playwright 스크롤바 강제 표시: headless 환경의 UI 트릭 | 2026.02 | xgen-frontend | injectScrollbarCSS |
| 56 | 시나리오 검증(Validation) 자동화: 녹화 → 실행 → 검증 파이프라인 | 2026.02 | xgen-frontend | 시나리오 검증, validate |
| 57 | 새 탭 감지 및 자동 전환: 브라우저 자동화의 까다로운 문제 | 2026.02 | xgen-app | detect new tabs, switch |
| 58 | Agent 채팅 UI: 도구 메시지 정리와 액션 배지 디자인 | 2026.02 | xgen-app | clean tool messages, action badges |
| 59 | 시나리오 배치 실행 엔진: selector fallback + excel loop | 2026.02 | xgen-frontend | batch execution, playback engine |
| 60 | LLM 텍스트 우선 표시: Agent UX에서의 응답 순서 최적화 | 2026.02 | xgen-frontend | LLM 텍스트 먼저 표시 |

### 🖥️ Frontend (15개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 61 | Next.js 기반 AI 워크플로우 에디터 만들기 (from scratch) | 2025.06 | xgen-app | Canvas, Node, Edge, Tailwind |
| 62 | 커스텀 노드 에디터: 드래그 앤 드롭 + 엣지 스냅핑 구현 | 2025.06 | xgen-app | edge snapping, port handling, zoom |
| 63 | React에서 Undo/Redo 구현: 워크플로우 에디터 히스토리 관리 | 2025.09 | xgen-app | undo_redo, history recording |
| 64 | 데이터 프로세서 UI: 파일 업로드/내보내기/통계 대시보드 | 2025.09 | xgen-app | DataProcessor, DataStation, statistics |
| 65 | 워크플로우 공유 권한 시스템: 읽기 전용 vs 편집 모드 | 2025.09 | xgen-app | share permissions, read-only |
| 66 | SSE 기반 파일 업로드 진행률 표시 + 취소 기능 | 2025.12 | xgen-frontend | AbortSignal, upload cancellation |
| 67 | 문서 디렉토리 트리 UI: 파일 카운트 + 컴팩트 레이아웃 | 2025.12 | xgen-frontend | DocumentsDirectoryTree, compact |
| 68 | React Hot Toast로 알림 시스템 개선하기 | 2025.07 | xgen-app | react-hot-toast, ToastProvider |
| 69 | DocumentsGraph: 문서 관계 시각화 컴포넌트 | 2025.09 | xgen-app | DocumentsGraph, relationships |
| 70 | Admin 모델 서빙 매니저: GPU 현황 + 모델 배포 UI | 2025.11-12 | xgen-frontend | AdminModelServingManager, GPU |
| 71 | Workflow Execution Panel: 검증 + 에러 핸들링 UI 패턴 | 2025.07 | xgen-app | ExecutionPanel, validation |
| 72 | MinIO 기반 모델 선택 UI: 로딩 상태와 에러 처리 | 2025.11 | xgen-frontend | MinIO model selection |
| 73 | 데이터셋 컬럼 관리: 삭제/치환/연산 모달 컴포넌트 설계 | 2025.09 | xgen-app | ColumnFormatModal, DatasetCallback |
| 74 | 인증 플로우 개선: 토큰 검증과 리프레시 처리 | 2025.11 | xgen-frontend | auth flow, logout, token validation |
| 75 | HuggingFace 업로드 모달: 파라미터 검증 + 에러 핸들링 | 2025.09 | xgen-app | uploadToHuggingFace, validation |

### 🏗️ 인프라 / DevOps (20개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 76 | K3s 위에 AI 플랫폼 올리기: 인프라 설계부터 배포까지 | 2025-2026 | xgen-infra, xgen2.0-infra | K3s, compose, k3s-infra |
| 77 | Jenkins JCasC로 6개 서비스 빌드 Job 자동 생성 | 2026.02 | xgen2.0-infra | JCasC, seed job, 6개 빌드 |
| 78 | Let's Encrypt + cert-manager로 K3s HTTPS 자동화 | 2026.02 | xgen2.0-infra | Let's Encrypt, cert-manager, HTTPS |
| 79 | Istio Gateway HTTPS 설정: TLS 인증서 관리 | 2026.02 | xgen2.0-infra | Istio Gateway, HTTPS 443 |
| 80 | Jenkins RBAC: Kubernetes 권한 설정 삽질기 | 2026.02 | xgen2.0-infra | RBAC, watch 권한, docker.sock |
| 81 | Docker BuildKit 캐시 전략과 NO_CACHE 옵션 | 2026.02 | xgen2.0-infra | BuildKit, NO_CACHE, 캐시 정리 |
| 82 | Dockerfile 최적화: COPY --chown vs chown -R 성능 비교 | 2026.02 | xgen2.0-infra | chown, COPY --chown 최적화 |
| 83 | Kubernetes Health Probe 타임아웃 설정: POD 재시작 방지 | 2026.02 | xgen2.0-infra | Health probe, 타임아웃, POD 재시작 |
| 84 | Kubernetes Downward API로 멀티 POD 세션 라우팅 | 2026.02 | xgen2.0-infra | Downward API, POD_NAME, POD_IP |
| 85 | pyproject.toml dependencies 추출로 Docker 빌드 최적화 | 2026.02 | xgen2.0-infra | pyproject.toml, Dockerfile.local |
| 86 | Jenkins executor 수 최적화: 동시 빌드 성능 튜닝 | 2026.02 | xgen2.0-infra | executor 2→6, 동시 빌드 |
| 87 | 디렉토리 구조 재편성: dockerfiles/compose/k3s 분리 전략 | 2026.02 | xgen2.0-infra | 디렉토리 구조 재편성 |
| 88 | Redis 인증 + 분산 환경 설정 가이드 | 2026.01-02 | xgen2.0-infra, xgen-documents | REDIS_PASSWORD, 분산 환경 |
| 89 | CLAUDE.md로 AI 코딩 어시스턴트 가이드라인 작성하기 | 2026.02 | xgen2.0-infra | CLAUDE.md, 작업 가이드 |
| 90 | 롯데홈쇼핑 서버 터널링 가이드: SSH 접속 구성 | 2026.02 | xgen2.0-infra | 터널링, 접속 정보 |
| 91 | 도메인 마이그레이션: xgen-stg → jeju-xgen 전환기 | 2026.02 | xgen2.0-infra | 도메인 변경 |
| 92 | GitLab CI/CD에서 EC2 배포 자동화 (SCP + SSH) | 2025.04 | search-rust | gitlab-ci, EC2, SCP |
| 93 | Docker Compose로 개발 환경 구성: .env 기반 설정 관리 | 2026.01 | xgen-backend-gateway | Docker Compose, .env |
| 94 | Tauri 앱 빌드: Linux deb/rpm 패키지 설정 | 2026.01 | xgen-app | tauri, deb, rpm, build targets |
| 95 | Sidecar 패턴: Tauri 앱에서 xgen-workflow 자동 시작 | 2026.01 | xgen-app | sidecar auto-start |

### 🔧 Backend / Gateway (15개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 96 | Rust로 API Gateway 만들기: JWT 검증 + CORS + 프록시 | 2025.10-2026.02 | xgen-backend-gateway | JWT validation, CORS, proxy |
| 97 | YAML + 환경변수 이중 설정 파싱 시스템 | 2025.10 | xgen-backend-gateway | YAML, environment variable formats |
| 98 | 2GB 파일 업로드를 위한 프록시 body size 설정 | 2025.11 | xgen-backend-gateway | max body size 2GB |
| 99 | 마이크로서비스 라우팅 통합: session-station → core 병합기 | 2026.02 | xgen-backend-gateway, xgen-core | session-station 통합, 라우팅 |
| 100 | Redis 기반 SSE 세션 상태 공유: 멀티 POD 환경 | 2026.01 | xgen-documents | Redis SSE, 멀티 POD, 세션 공유 |
| 101 | LocalConfigManager 분산 환경 전환: 파일 → API 기반 | 2026.02 | xgen-core | 분산 환경, 파일 fallback 제거 |
| 102 | UploadProgressManager: Redis 기반 분산 진행률 관리 | 2026.02 | xgen-documents | UploadProgressManager, Redis |
| 103 | 레포지토리 스케줄러의 분산 환경 전환 | 2026.02 | xgen-documents | 스케줄러 분산, Redis 기반 |
| 104 | Gateway 서비스 매핑: LLM/Crawler/ML 통합 구성 | 2025.12 | xgen-backend-gateway | services configuration, consolidate |
| 105 | 문서 처리 서비스에 DeepSeek 지시문 적용하기 | 2025.12 | xgen-documents | deepseek, vllm |

### 🖥️ 데스크톱 앱 / Tauri (10개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 106 | Tauri 2.0으로 AI 데스크톱 앱 만들기 | 2025.06-2026.02 | xgen-app | Tauri, Next.js, Rust backend |
| 107 | Remote WebView 아키텍처: 로컬 앱 ↔ 원격 서버 연동 | 2026.02 | xgen-app | Remote WebView, Connected mode |
| 108 | Bore 프로토콜로 터널 통신 구현하기 | 2026.01 | xgen-app | bore protocol, tunnel, proxy |
| 109 | Tauri Sidecar로 Python 워크플로우 엔진 자동 시작 | 2026.01 | xgen-app | sidecar, xgen-workflow, embedding |
| 110 | 앱 모드 전환: Standalone vs Connected 아키텍처 | 2026.01-02 | xgen-app | app mode, Standalone, Connected |
| 111 | Tauri + Docker: 데스크톱 앱의 컨테이너화 전략 | 2026.01 | xgen-app | Docker configuration, build |
| 112 | API 추상화 레이어: 로컬 LLM과 원격 서비스 통합 | 2026.01 | xgen-app | API abstraction, LLM inference |
| 113 | TAURI_DEV_URL 환경변수로 개발/운영 환경 분리 | 2026.02 | xgen-app | TAURI_DEV_URL, env var |
| 114 | 데스크톱 앱에서 터널 URL 표시 UX 개선 | 2026.01 | xgen-app | tunnel URL display |
| 115 | camelCase 직렬화로 Rust ↔ Frontend 데이터 통신 | 2026.01 | xgen-app | camelCase serialization |

### 📊 데이터 처리 / 워크플로우 (5개)

| # | 주제 | 시기 | 레포 | 주요 커밋 키워드 |
|---|------|------|------|-----------------|
| 116 | 비주얼 워크플로우 에디터: 노드 기반 AI 파이프라인 설계 | 2025.06-09 | xgen-app | workflow, node, edge, canvas |
| 117 | SSE 기반 워크플로우 테스터: 실시간 실행 결과 스트리밍 | 2025.12 | xgen-workflow | workflow tester, SSE, streaming |
| 118 | 워크플로우 실행 취소(Cancellation) 메커니즘 구현 | 2025.12 | xgen-workflow | cancellation, tester execution |
| 119 | Agent Xgen Node: AI 에이전트를 워크플로우 노드로 | 2025.12 | xgen-workflow | Agent Xgen Node, consolidate |
| 120 | 클라이언트 연결 끊김에도 워크플로우 실행 유지하기 | 2025.12 | xgen-workflow | ignore client disconnection |

---

## 요약 통계

| 카테고리 | 주제 수 | 주요 레포 |
|----------|---------|-----------|
| 🔍 검색 엔진 / AI Search | 25 | search-rust, x2bee-nest-search, search-semantic-api |
| 🤖 AI/ML & LLM | 20 | xgen-model, xgen-workflow, xgen-retrieval, xgen-embedding |
| 🤖 AI Agent / 브라우저 자동화 | 15 | xgen-app, xgen-frontend |
| 🖥️ Frontend | 15 | xgen-app, xgen-frontend |
| 🏗️ 인프라 / DevOps | 20 | xgen2.0-infra, xgen-infra |
| 🔧 Backend / Gateway | 10 | xgen-backend-gateway, xgen-core, xgen-documents |
| 🖥️ 데스크톱 앱 / Tauri | 10 | xgen-app |
| 📊 데이터 처리 / 워크플로우 | 5 | xgen-workflow, xgen-app |
| **합계** | **120** | |

## 추천 TOP 10 (임팩트 기준)

1. 🔥 **Rust로 커머스 검색 엔진을 처음부터 만들기** — 66커밋, 시리즈물 가능
2. 🔥 **AI Agent 기반 브라우저 자동화 시스템 구축기** — 최신, 1000+커밋
3. 🔥 **llama.cpp + ROCm: AMD GPU에서 LLM 서빙하기** — 희귀한 경험
4. 🔥 **시맨틱+키워드 하이브리드 검색 최적화** — 304커밋 분량
5. 🔥 **K3s 위에 AI 플랫폼 올리기** — 인프라 412커밋
6. 🔥 **Tauri 2.0으로 AI 데스크톱 앱 만들기** — 풀스택
7. 🔥 **Human-in-the-Loop AI Agent 설계** — 트렌디한 주제
8. 🔥 **Qdrant 하이브리드 검색 구현** — RAG 실전
9. 🔥 **Rust API Gateway: JWT + CORS + 프록시** — 시스템 프로그래밍
10. 🔥 **Redis 기반 분산 세션 관리** — 실전 마이크로서비스
