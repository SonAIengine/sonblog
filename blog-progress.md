# 블로그 포트폴리오 글 작성 진행상황

## 전체 주제 목록 (시간순)
1. ✅ 2024.03 — 챗봇 UI 개발 (WebSocket 스트리밍) → 완료
2. ✅ 2024.03~05 — GliNER/DPO/LoRA 모델 파인튜닝 → 완료
3. ✅ 2024.05~09 — 벡터 기반 시맨틱 검색 → 완료
4. ✅ 2024.05 — 상품 리뷰 분석 API → 완료
5. ✅ 2024.07~09 — 이미지 검색 기능 구현 → 완료
6. ✅ 2024.08~10 — Code Assistant 개발 → 완료
7. ✅ 2024.11 — Search API / LLMOps Docker 구성 → 완료
8. ✅ 2025.01 — OJT 리팩토링 / Kotaemon RAG → 완료
9. ✅ 2025.12 — XGEN 1.0 GPU 모델 서빙 (vLLM/llama.cpp) → 완료
10. ✅ 2025.12 — XGEN 1.0 워크플로우 엔진 + Qdrant 하이브리드 검색 → 완료
11. ✅ 2025.12 — XGEN 1.0 프론트엔드 (모델 관리 UI) → 완료
12. ✅ 2026.01 — XGEN 2.0 인프라 (K8s, ArgoCD, 롯데 운영 배포) → 완료
13. ✅ 2026.01 — XGEN 2.0 모델 서빙 리팩토링 → 완료
14. ⬜ 2026.02 — XGEN Agent Tool Ecosystem + Tauri 데스크톱 앱

## 카테고리 매핑 (A안 - 독립 카테고리)
| 카테고리 | 폴더 | 주제 수 |
|----------|-------|---------|
| 검색 엔진 / AI Search | `search-engine/` | 25개 (#1~#25) |
| AI/ML & LLM | `ai/` | 20개 (#26~#45) |AI/ML & LLM (20개)
| AI Agent / 브라우저 자동화 | `agent/` | 15개 (#46~#60) |
| Frontend | `frontend/` | 15개 (#61~#75) |
| 인프라 / DevOps | `infra/` | 20개 (#76~#95) |
| Backend / Gateway | `backend/` | 10개 (#96~#105) |
| 데스크톱 앱 / Tauri | `desktop/` | 10개 (#106~#115) |
| 워크플로우 | `workflow/` | 5개 (#116~#120) |

## 🔜 Phase 2 계획 (120개 완료 후)
- 120개 기술 블로그 글이 전부 완성된 후, 핵심 내용을 추려서 `portfolio/` 카테고리에 포트폴리오 작성
- **개발 포트폴리오**: 핵심 개발 내용 (AI Agent, 검색 엔진, LLM 서빙 등) 종합 정리
- **인프라 포트폴리오**: K8s, CI/CD, 모니터링, 분산 시스템 등 인프라 구성 종합 정리
- 기술 블로그 글 링크를 레퍼런스로 연결하여 깊이 있는 포트폴리오 구성

## 마지막 작성
- 날짜: 2026-02-18
- 작성 완료 시기: 2024.03~2026.02 (글 1~13), 검색엔진 #1~#25, AI/ML #26~#45, AI Agent #46~#60, Frontend #61~#63, DevOps #77~#95
- 다음 작성 대상: Frontend #70~#75

## 작성 완료 글
- docs/portfolio/챗봇 UI 개발기 - WebSocket 기반 실시간 스트리밍.md
- docs/ai/GliNER과 DPO-LoRA를 활용한 모델 파인튜닝.md
- docs/search-engine/벡터 기반 시맨틱 검색 구현기.md
- docs/portfolio/상품-리뷰-분석-API-개발기.md
- docs/search-engine/이미지-검색-기능-구현기.md
- docs/ai/Code-Assistant-개발기.md
- docs/infra/Search-API와-LLMOps-Docker-구성기.md
- docs/ai/OJT-리팩토링과-Kotaemon-RAG-구현기.md
- docs/ai/XGEN-1.0-GPU-모델-서빙-구현기.md
- docs/ai/XGEN-1.0-워크플로우-엔진과-Qdrant-하이브리드-검색.md
- docs/portfolio/XGEN-1.0-프론트엔드-모델-관리-UI-구현.md
- docs/infra/XGEN-2.0-인프라-K8s-ArgoCD-운영-배포.md
- docs/ai/XGEN-2.0-모델-서빙-통합-아키텍처-리팩토링.md
- docs/ai/XGEN-2.0-임베딩-전용-서버와-배치-처리-최적화.md
- docs/ai/XGEN-2.0-워크플로우-접근-제어와-IO-로깅-시스템.md
- docs/search-engine/Rust로-커머스-검색-엔진을-처음부터-만들기.md (#1)
- docs/search-engine/Axum-OpenSearch-Rust-검색-API-아키텍처-설계.md (#2)
- docs/search-engine/PostgreSQL과-MySQL-동시-지원하는-Rust-DB-추상화-레이어-구현.md (#3)
- docs/search-engine/Rust-검색-엔진에-Redis-캐싱-적용기.md (#4)
- docs/search-engine/OpenSearch-인덱싱-서비스-스트리밍-vs-배치-처리-비교.md (#5)
- docs/search-engine/Rust-검색-엔진에서-SSH-터널링으로-원격-DB-접근하기.md (#6)
- docs/search-engine/OpenSearch-Aggregation-검색-구현-및-에러-핸들링-전략.md (#7)
- docs/search-engine/커머스-상품-추천-검색-API-설계.md (#8)
- docs/search-engine/Rust-검색-엔진의-CI-CD-파이프라인-구축.md (#9)
- docs/search-engine/Rust 검색 엔진/OpenSearch-동의어-사전-관리-자동화.md (#10)
- docs/search-engine/Rust 검색 엔진/Handlebars-템플릿으로-동적-검색-쿼리-생성하기.md (#11)
- docs/search-engine/Rust 검색 엔진/커서-기반-인덱싱-vs-전체-인덱싱-성능-비교.md (#12)
- docs/search-engine/Rust 검색 엔진/Rate-Limiting이-적용된-검색-API-설계.md (#13)
- docs/search-engine/NestJS 검색 엔진/NestJS-기반-이커머스-검색-엔진-개발기.md (#14)
- docs/search-engine/NestJS 검색 엔진/시맨틱-검색과-키워드-검색의-하이브리드-전략.md (#15)
- docs/search-engine/NestJS 검색 엔진/GPT를-활용한-검색-쿼리-의도-분석-및-키워드-추출.md (#16)
- docs/search-engine/NestJS 검색 엔진/검색-품질-개선-성별-색상-카테고리-필터링-최적화.md (#17)
- docs/search-engine/NestJS 검색 엔진/벡터-검색-유사도-임계값-동적-조정-토큰-수-기반.md (#18)
- docs/search-engine/NestJS 검색 엔진/Reranker-모델-도입으로-검색-정확도-향상하기.md (#19)
- docs/search-engine/시맨틱 검색/FAISS-벡터-인덱스-적용과-GPU-디바이스-최적화.md (#20)
- docs/search-engine/시맨틱 검색/시맨틱-검색-API-요약-기능-온오프-전략.md (#21)
- docs/search-engine/NestJS 검색 엔진/OpenSearch-Nori-분석기-커스터마이징-및-형태소-분석.md (#22)
- docs/search-engine/NestJS 검색 엔진/이미지-기반-상품-검색-NestJS-통합-구현기.md (#23)
- docs/search-engine/NestJS 검색 엔진/검색-결과-랭킹-스코어링-시스템-설계.md (#24)
- docs/search-engine/NestJS 검색 엔진/Cosine-Similarity-직접-구현으로-검색-재순위화.md (#25)
- docs/ai/XGEN/llama.cpp-서버-운영기-ROCm-GPU에서의-삽질과-해결.md (AI/ML #26)
- docs/ai/XGEN/AMD-GPU에서-LLM-돌리기-Vulkan-vs-ROCm-비교.md (AI/ML #27)
- docs/ai/XGEN/멀티-GPU-LLM-배포-GPU-선택-및-레이어-오프로딩-전략.md (AI/ML #28)
- docs/ai/XGEN/vLLM-vs-llama.cpp-백엔드-스위칭-아키텍처-설계.md (AI/ML #29)
- docs/ai/XGEN/OpenAI-호환-API-서버-직접-만들기.md (AI/ML #30)
- docs/ai/XGEN/로컬-LLM-모델-관리-시스템-로드-언로드-활성화-라이프사이클.md (AI/ML #31)
- docs/ai/XGEN/Embedding-모델-서빙-batch-size-최적화.md (AI/ML #32)
- docs/ai/XGEN/HuggingFace-모델-검색-및-다운로드-자동화.md (AI/ML #33)
- docs/ai/XGEN/Late-Chunking과-Sparse-Embedding-차세대-검색-파이프라인.md (AI/ML #34)
- docs/ai/XGEN/Iterative-RAG-검색-엔진-구현.md (AI/ML #35)
- docs/ai/XGEN/Qdrant-하이브리드-검색-Sparse-Dense-벡터-통합.md (AI/ML #36)
- docs/ai/XGEN/RAG-서비스-토큰-관리와-컨텍스트-윈도우-최적화.md (AI/ML #37)
- docs/ai/XGEN/워크플로우-실행-메모리-최적화-SearchCache-싱글턴-풀-패턴.md (AI/ML #38)
- docs/ai/XGEN/SSE-스트리밍으로-대규모-배치-워크플로우-결과-전달하기.md (AI/ML #39)
- docs/ai/XGEN/문서-임베딩-파이프라인-청킹-옵션과-전처리-전략.md (AI/ML #40)
- docs/ai/XGEN/벡터DB-컬렉션-문서-요약-및-페이지네이션-API-설계.md (AI/ML #41)
- docs/ai/XGEN/Sparse-Vector와-Full-Text-Index-하이브리드-검색-구현.md (AI/ML #42)
- docs/ai/XGEN/CustomHTTPEmbedding-클라이언트-타임아웃과-배치-처리.md (AI/ML #43)
- docs/ai/XGEN/vLLM-모델-배포-샘플링-파라미터-튜닝-가이드.md (AI/ML #44)
- docs/ai/XGEN/GPU-상태-모니터링-및-자동-모델-배포-시스템.md (AI/ML #45)
- docs/devops/infra/Jenkins-JCasC로-6개-서비스-빌드-Job-자동-생성.md (DevOps #77)
- docs/devops/infra/Lets-Encrypt-cert-manager로-K3s-HTTPS-자동화.md (DevOps #78)
- docs/devops/infra/Istio-Gateway-HTTPS-설정-TLS-인증서-관리.md (DevOps #79)
- docs/devops/infra/Jenkins-RBAC-Kubernetes-권한-설정-삽질기.md (DevOps #80)
- docs/devops/infra/Docker-BuildKit-캐시-전략과-NO_CACHE-옵션.md (DevOps #81)
- docs/devops/infra/Dockerfile-최적화-COPY-chown-vs-chown-R.md (DevOps #82)
- docs/devops/infra/Kubernetes-Health-Probe-타임아웃-설정.md (DevOps #83)
- docs/devops/infra/Kubernetes-Downward-API로-멀티-POD-세션-라우팅.md (DevOps #84)
- docs/devops/infra/pyproject-toml-dependencies-추출로-Docker-빌드-최적화.md (DevOps #85)
- docs/devops/infra/Jenkins-executor-수-최적화-동시-빌드-성능-튜닝.md (DevOps #86)
- docs/devops/infra/XGEN-인프라-디렉토리-구조-재편성-dockerfiles-compose-k3s-분리.md (DevOps #87)
- docs/devops/infra/Redis-인증-설정과-K3s-분산-환경-관리.md (DevOps #88)
- docs/devops/infra/CLAUDE-md로-AI-코딩-어시스턴트-가이드라인-작성하기.md (DevOps #89)
- docs/devops/infra/롯데홈쇼핑-폐쇄망-서버-SSH-터널링-접속-구성.md (DevOps #90)
- docs/devops/infra/XGEN-도메인-마이그레이션-xgen-stg에서-jeju-xgen으로.md (DevOps #91)
- docs/devops/infra/GitLab-CI-CD에서-EC2-배포-자동화-SCP-SSH.md (DevOps #92)
- docs/devops/infra/Docker-Compose-개발환경-구성-env-기반-설정-관리.md (DevOps #93)
- docs/devops/infra/Tauri-앱-빌드-Linux-deb-rpm-패키지-설정.md (DevOps #94)
- docs/devops/infra/Sidecar-패턴-Tauri-앱에서-xgen-workflow-자동-시작.md (DevOps #95)
- docs/agent/AI-Agent-기반-브라우저-자동화-시스템-구축기.md (AI Agent #46)
- docs/agent/Claude-Code-수준의-Agent-정확도-달성하기.md (AI Agent #47)
- docs/agent/MCP로-Agent-속도-3-5x-개선.md (AI Agent #48)
- docs/agent/Human-in-the-Loop-AI-Agent에-사람-개입-지점-설계하기.md (AI Agent #49)
- docs/agent/시나리오-레코더-사용자-행동-녹화-및-재생-엔진.md (AI Agent #50)
- docs/agent/브라우저-자동화-시-페이지-네비게이션-생존-전략.md (AI Agent #51)
- docs/agent/CSS-셀렉터-대체-전략-selector-alternatives로-안정성-확보.md (AI Agent #52)
- docs/agent/엑셀-루프-자동화-Agent-스토리지-연동으로-반복-작업-처리.md (AI Agent #53)
- docs/agent/Agent-실시간-상태-바-메시지-큐와-즉각-피드백-UX.md (AI Agent #54)
- docs/agent/Playwright-스크롤바-강제-표시-headless-환경의-UI-트릭.md (AI Agent #55)
- docs/agent/시나리오-검증-자동화-녹화-실행-검증-파이프라인.md (AI Agent #56)
- docs/agent/새-탭-감지-및-자동-전환-브라우저-자동화의-까다로운-문제.md (AI Agent #57)
- docs/agent/Agent-채팅-UI-도구-메시지-정리와-액션-배지-디자인.md (AI Agent #58)
- docs/agent/시나리오-배치-실행-엔진-selector-fallback과-excel-loop.md (AI Agent #59)
- docs/agent/LLM-텍스트-우선-표시-Agent-UX에서의-응답-순서-최적화.md (AI Agent #60)
- docs/frontend/Next.js-기반-AI-워크플로우-에디터-만들기.md (Frontend #61)
- docs/frontend/커스텀-노드-에디터-드래그-앤-드롭과-엣지-스냅핑-구현.md (Frontend #62)
- docs/frontend/React에서-Undo-Redo-구현-워크플로우-에디터-히스토리-관리.md (Frontend #63)
- docs/frontend/데이터-프로세서-UI-파일-업로드-내보내기-통계-대시보드.md (Frontend #64)
- docs/frontend/워크플로우-공유-권한-시스템-읽기-전용-vs-편집-모드.md (Frontend #65)
- docs/frontend/SSE-기반-파일-업로드-진행률-표시와-취소-기능.md (Frontend #66)
- docs/frontend/문서-디렉토리-트리-UI-파일-카운트와-컴팩트-레이아웃.md (Frontend #67)
- docs/frontend/React-Hot-Toast로-알림-시스템-개선하기.md (Frontend #68)
- docs/frontend/DocumentsGraph-문서-관계-시각화-컴포넌트.md (Frontend #69)
