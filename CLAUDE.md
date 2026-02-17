# SON BLOG - Claude Code 작업 지침

## 프로젝트 정보
- GitHub: https://github.com/SonAIengine/sonblog
- 배포: https://sonaiengine.github.io/sonblog/
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

### MkDocs Material 메타데이터
```yaml
---
title: "제목"
description: "설명"
date: YYYY-MM-DD
tags:
  - tag1
  - tag2
---
```

### 금지 사항
- 이모지/이모티콘 사용 절대 금지 (HTML 엔티티, 유니코드 이모지 포함)
- 마크다운 테이블 남용 금지
- 뻔한 서론/결론 금지 ("이번 포스트에서는~", "감사합니다")
- AI가 쓴 티 나는 표현 금지 ("살펴보겠습니다", "알아보겠습니다")

## 블로그 작성 참조 파일

- 진행 상황: /home/son/sonblog/blog-progress.md (완료 글 목록, Phase 2 계획)
- 주제 전체 목록 (120개, 커밋 키워드 포함): /home/son/sonblog/blog-topics-full.md

## 블로그 작성 진행 상황

### 완료 (24개)
1. ✅ 챗봇 UI 개발 (WebSocket 스트리밍)
2. ✅ GliNER/DPO/LoRA 모델 파인튜닝
3. ✅ 벡터 기반 시맨틱 검색
4. ✅ 상품 리뷰 분석 API
5. ✅ 이미지 검색 기능 구현
6. ✅ Code Assistant 개발
7. ✅ Search API / LLMOps Docker 구성
8. ✅ OJT 리팩토링 / Kotaemon RAG
9. ✅ XGEN 1.0 GPU 모델 서빙
10. ✅ XGEN 1.0 워크플로우 엔진 + Qdrant 하이브리드 검색
11. ✅ XGEN 1.0 프론트엔드 (모델 관리 UI)
12. ✅ XGEN 2.0 인프라 (K8s, ArgoCD)
13. ✅ XGEN 2.0 모델 서빙 리팩토링
14. ✅ XGEN 2.0 임베딩 전용 서버와 배치 처리 최적화
15. ✅ XGEN 2.0 워크플로우 접근 제어와 IO 로깅 시스템
16. ✅ 검색엔진 #1: Rust로 커머스 검색 엔진을 처음부터 만들기
17. ✅ 검색엔진 #2: Axum + OpenSearch Rust 검색 API 아키텍처 설계
18. ✅ 검색엔진 #3: PostgreSQL과 MySQL 동시 지원하는 Rust DB 추상화 레이어
19. ✅ 검색엔진 #4: Rust 검색 엔진에 Redis 캐싱 적용기
20. ✅ 검색엔진 #5: OpenSearch 인덱싱 서비스 스트리밍 vs 배치 처리
21. ✅ 검색엔진 #6: Rust 검색 엔진에서 SSH 터널링으로 원격 DB 접근
22. ✅ 검색엔진 #7: OpenSearch Aggregation 검색 구현 및 에러 핸들링 전략
23. ✅ 검색엔진 #8: 커머스 상품 추천 검색 API 설계
24. ✅ 검색엔진 #9: Rust 검색 엔진의 CI/CD 파이프라인 구축

### 다음 작성 대상 (#10~#120, 96개 남음)

검색 엔진 / AI Search (#10~#25):
- #10: OpenSearch 동의어(Synonym) 사전 관리 자동화
- #11: Handlebars 템플릿으로 동적 검색 쿼리 생성하기
- #12: 커서 기반 인덱싱 vs 전체 인덱싱: 성능 비교
- #13: Rate Limiting이 적용된 검색 API 설계
- #14: NestJS 기반 이커머스 검색 엔진 개발기 (x2bee-nest-search)
- #15: 시맨틱 검색과 키워드 검색의 하이브리드 전략
- #16: GPT를 활용한 검색 쿼리 의도 분석 및 키워드 추출
- #17: 검색 품질 개선: 성별/색상/카테고리 필터링 최적화
- #18: 벡터 검색 유사도 임계값 동적 조정 (토큰 수 기반)
- #19: Reranker 모델 도입으로 검색 정확도 향상하기
- #20: FAISS 벡터 인덱스 적용과 GPU 디바이스 최적화
- #21: 시맨틱 검색 API: 요약(Summary) 기능 온/오프 전략
- #22: OpenSearch Nori 분석기 커스터마이징 및 형태소 분석
- #23: 이미지 기반 상품 검색 구현기
- #24: 검색 결과 랭킹 스코어링 시스템 설계
- #25: Cosine Similarity 직접 구현으로 검색 재순위화

AI/ML & LLM (#26~#45):
- #26~#45: blog-topics-full.md 참조

AI Agent / 브라우저 자동화 (#46~#60):
- #46~#60: blog-topics-full.md 참조

Frontend (#61~#75):
- #61~#75: blog-topics-full.md 참조

인프라 / DevOps (#76~#95):
- #76~#95: blog-topics-full.md 참조

Backend / Gateway (#96~#105):
- #96~#105: blog-topics-full.md 참조

데스크톱 앱 / Tauri (#106~#115):
- #106~#115: blog-topics-full.md 참조

워크플로우 (#116~#120):
- #116~#120: blog-topics-full.md 참조

## 카테고리 구조 (120개)

| 카테고리 | 폴더 | 주제 수 |
|----------|-------|---------|
| 검색 엔진 / AI Search | `search-engine/` | 25개 (#1~#25) |
| AI/ML & LLM | `ai/` | 20개 (#26~#45) |
| AI Agent / 브라우저 자동화 | `agent/` | 15개 (#46~#60) |
| Frontend | `frontend/` | 15개 (#61~#75) |
| 인프라 / DevOps | `infra/` | 20개 (#76~#95) |
| Backend / Gateway | `backend/` | 10개 (#96~#105) |
| 데스크톱 앱 / Tauri | `desktop/` | 10개 (#106~#115) |
| 워크플로우 | `workflow/` | 5개 (#116~#120) |

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
