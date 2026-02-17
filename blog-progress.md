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
- 날짜: 2026-02-17
- 작성 완료 시기: 2024.03~2026.02 (글 1~13), 검색엔진 #1~#13, AI/ML #26~#27
- 다음 작성 대상: AI/ML #29 (vLLM vs llama.cpp: 백엔드 스위칭 아키텍처 설계)

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
- docs/ai/XGEN/llama.cpp-서버-운영기-ROCm-GPU에서의-삽질과-해결.md (AI/ML #26)
- docs/ai/XGEN/AMD-GPU에서-LLM-돌리기-Vulkan-vs-ROCm-비교.md (AI/ML #27)
- docs/ai/XGEN/멀티-GPU-LLM-배포-GPU-선택-및-레이어-오프로딩-전략.md (AI/ML #28)
