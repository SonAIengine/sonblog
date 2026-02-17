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
- 이모지 사용 금지
- 마크다운 테이블 남용 금지
- 뻔한 서론/결론 금지 ("이번 포스트에서는~", "감사합니다")
- AI가 쓴 티 나는 표현 금지 ("살펴보겠습니다", "알아보겠습니다")

## 블로그 작성 진행 상황

### 완료 (22개)
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
22. ✅ 검색엔진 #7~#9: Aggregation, 추천 검색 API, CI/CD 파이프라인

### 다음 작성 대상
- 검색엔진 #10: OpenSearch 동의어(Synonym) 사전 관리 자동화
- 이후 #11~#120까지 순차 진행

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

## 주제 전체 목록 (상세)

상세 주제 목록과 커밋 키워드는 아래 파일 참조:
- /home/son/.openclaw/workspace/memory/blog-topics-full.md

## XGEN 프로젝트 참조 정보

블로그 글 작성 시 실제 코드를 참조해야 할 경우:
- XGEN 인프라: /home/son/xgen-infra
- GitLab 그룹: https://gitlab.x2bee.com/xgen2.0
- GitLab Token: WyCtoUJQCvjdJTVxaaL6 (Username: sonsj97)
- 서비스: xgen-frontend, xgen-backend-gateway, xgen-core, xgen-workflow, xgen-documents, xgen-mcp-station, xgen-app, xgen-model
