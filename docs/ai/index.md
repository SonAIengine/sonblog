---
title: AI/ML & LLM
description: "GPU 모델 서빙, RAG 파이프라인, 임베딩 최적화, 모델 파인튜닝까지 — LLM을 실제 서비스에 붙이며 쌓은 기술 기록"
hide:
  - toc
---

# AI/ML & LLM

AMD ROCm에서 llama.cpp를 돌리고, Qdrant 하이브리드 검색을 구성하고, vLLM과 llama-server 사이를 오가며 쌓은 기록이다. GPU 한 장으로 70B 모델을 서빙하려면 어디서 레이어를 끊어야 하는지, RAG 파이프라인에서 컨텍스트 윈도우를 어떻게 다루는지 — 실제 운영하면서 부딪힌 문제들을 다룬다.

---

## XGEN 플랫폼 구축기

XGEN 2.0 AI 에이전트 플랫폼을 구축하며 쌓인 LLM 서빙, RAG, 임베딩, 워크플로우 관련 기록. llama.cpp ROCm부터 Qdrant 하이브리드 검색, SSE 스트리밍까지 20개 글.

- [llama.cpp 서버 운영기: ROCm GPU에서의 삽질과 해결](XGEN/llama.cpp-서버-운영기-ROCm-GPU에서의-삽질과-해결.md)
- [Qdrant 하이브리드 검색: Sparse + Dense 벡터 통합](XGEN/Qdrant-하이브리드-검색-Sparse-Dense-벡터-통합.md)
- [Sparse Vector와 Full-Text Index 하이브리드 검색 구현](XGEN/Sparse-Vector와-Full-Text-Index-하이브리드-검색-구현.md)
- [vLLM 모델 배포: 샘플링 파라미터 튜닝 가이드](XGEN/vLLM-모델-배포-샘플링-파라미터-튜닝-가이드.md)
- [GPU 상태 모니터링 및 자동 모델 배포 시스템](XGEN/GPU-상태-모니터링-및-자동-모델-배포-시스템.md)

---

## 모델 파인튜닝

GliNER NER 모델 파인튜닝, DPO/LoRA 학습, Kotaemon RAG 프레임워크 커스터마이징까지 — 모델을 직접 손보며 배운 것들.

- [GliNER과 DPO-LoRA를 활용한 모델 파인튜닝](파인튜닝/gliner-dpo-lora-finetuning.md)
- [OJT 리팩토링과 Kotaemon RAG 구현기](파인튜닝/OJT-리팩토링과-Kotaemon-RAG-구현기.md)

---

## LLM 서빙 프레임워크 비교

vLLM, SGLang, LMDeploy, llama.cpp — 어떤 프레임워크가 어떤 상황에 맞는지 비교 분석.

- [vLLM vs LMDeploy vs SGLang 성능 비교](Model Serve/vllm-vs-lmdeploy-vs-sglang.md)
- [SGLang vs vLLM](Model Serve/sglang-vs-vllm.md)
