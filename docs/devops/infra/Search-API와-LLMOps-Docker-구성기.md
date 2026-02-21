---
title: "Search API와 LLMOps Docker 구성기"
description: "검색 API 성능 최적화와 LLMOps 파이프라인의 Docker 환경 구성을 진행했다. 아키텍처 설계와 컨테이너화 전략, docker-compose 멀티 서비스 구성까지."
date: 2024-11-01
series: "DevOps 실전"
series_order: 1
difficulty: intermediate
tags:
  - Docker
  - LLMOps
  - 인프라
  - CI/CD
  - docker-compose
  - 컨테이너
  - 검색API
  - 마이크로서비스
  - DevOps
  - 배포
related:
  - devops/infra/XGEN-2.0-인프라-K8s-ArgoCD-운영-배포.md
  - devops/infra/Docker-BuildKit-캐시-전략과-NO_CACHE-옵션.md
  - devops/infra/K3s-위에-AI-플랫폼-올리기-인프라-설계부터-배포까지.md
---
# Search API와 LLMOps Docker 구성기

> 2024년 11월 프로젝트에서 검색 API 성능 최적화와 LLMOps 파이프라인의 Docker 환경 구성을 진행했다. 이 과정에서 마주친 아키텍처 설계와 컨테이너화 전략을 공유한다.

## 문제 상황

기존 XGEN 1.0 플랫폼에서 벡터 검색 API가 단일 인스턴스로 운영되면서 여러 문제가 발생했다:

- **확장성 이슈**: 동시 요청 증가 시 응답 속도 저하
- **의존성 충돌**: Python 패키지 버전 불일치로 인한 환경 문제  
- **배포 복잡성**: 모델 업데이트 시 전체 서비스 재시작 필요

특히 RAG 파이프라인에서 벡터 검색과 텍스트 생성이 하나의 컨테이너에서 실행되어 리소스 경합이 심각했다.

## 아키텍처 설계

### 마이크로서비스 분리

기존 모놀리식 구조를 다음과 같이 분리했다:

```yaml
# docker-compose.yml
version: '3.8'
services:
  search-api:
    build: ./search-service
    ports:
      - "8001:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - VECTOR_DB_URL=qdrant:6333
    depends_on:
      - redis
      - qdrant
      
  llm-service:
    build: ./llm-service
    ports:
      - "8002:8000"
    environment:
      - MODEL_PATH=/models
      - GPU_MEMORY_FRACTION=0.7
    volumes:
      - ./models:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  qdrant:
    image: qdrant/qdrant:v1.6.1
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

### Search API 최적화

검색 서비스를 별도로 분리하고 성능을 최적화했다:

```python
# search_service/app.py
from fastapi import FastAPI, HTTPException
from qdrant_client import QdrantClient
import asyncio
import numpy as np
from typing import List, Dict

app = FastAPI(title="Search API v2")

class SearchEngine:
    def __init__(self):
        self.qdrant = QdrantClient(url="http://qdrant:6333")
        self.redis = redis.Redis.from_url("redis://redis:6379")
        
    async def hybrid_search(
        self, 
        query: str, 
        collection: str,
        limit: int = 10,
        score_threshold: float = 0.7
    ) -> List[Dict]:
        """하이브리드 검색: 벡터 + 키워드 검색 결합"""
        
        # 1. 벡터 검색
        vector_results = await self._vector_search(query, collection, limit*2)
        
        # 2. 키워드 검색 (BM25)
        keyword_results = await self._keyword_search(query, collection, limit*2)
        
        # 3. RRF (Reciprocal Rank Fusion) 적용
        combined_results = self._apply_rrf(vector_results, keyword_results)
        
        # 4. 스코어 임계값 적용
        filtered_results = [
            r for r in combined_results 
            if r['score'] >= score_threshold
        ]
        
        return filtered_results[:limit]
    
    def _apply_rrf(self, vector_results, keyword_results, k=60):
        """RRF 알고리즘으로 검색 결과 융합"""
        doc_scores = {}
        
        # 벡터 검색 점수
        for rank, result in enumerate(vector_results):
            doc_id = result['id']
            doc_scores[doc_id] = doc_scores.get(doc_id, 0) + 1/(k + rank + 1)
            
        # 키워드 검색 점수  
        for rank, result in enumerate(keyword_results):
            doc_id = result['id']
            doc_scores[doc_id] = doc_scores.get(doc_id, 0) + 1/(k + rank + 1)
            
        # 점수순 정렬
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        return [{'id': doc_id, 'score': score} for doc_id, score in sorted_docs]

@app.post("/search/hybrid")
async def hybrid_search(request: SearchRequest):
    try:
        results = await search_engine.hybrid_search(
            query=request.query,
            collection=request.collection,
            limit=request.limit,
            score_threshold=request.score_threshold
        )
        return {"results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### LLMOps 파이프라인

모델 학습부터 배포까지의 전체 파이프라인을 Docker로 표준화했다:

```dockerfile
# llm-service/Dockerfile
FROM nvidia/cuda:11.8-devel-ubuntu22.04

# Python 환경 설정
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# CUDA 환경 변수
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=$CUDA_HOME/bin:$PATH
ENV LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 모델 최적화 스크립트
COPY scripts/optimize_model.py /app/scripts/
COPY src/ /app/src/

WORKDIR /app

# 모델 로딩 최적화
ENV TRANSFORMERS_CACHE=/models/cache
ENV HF_HOME=/models/cache
ENV TORCH_CACHE_DIR=/models/cache

CMD ["python", "src/main.py"]
```

모델 최적화 스크립트:

```python
# scripts/optimize_model.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from optimum.onnxruntime import ORTModelForCausalLM
import logging

def optimize_model(model_path: str, output_path: str):
    """모델 최적화: ONNX 변환 + 양자화"""
    
    logger = logging.getLogger(__name__)
    
    # 1. 원본 모델 로딩
    logger.info(f"Loading model from {model_path}")
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        device_map="auto"
    )
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    
    # 2. ONNX 변환
    logger.info("Converting to ONNX...")
    ort_model = ORTModelForCausalLM.from_pretrained(
        model_path,
        export=True,
        device_map="cuda:0"
    )
    
    # 3. 동적 양자화 적용
    from onnxruntime.quantization import quantize_dynamic, QuantType
    
    logger.info("Applying dynamic quantization...")
    quantized_model_path = f"{output_path}/model_quantized.onnx"
    quantize_dynamic(
        f"{output_path}/model.onnx",
        quantized_model_path,
        weight_type=QuantType.QInt8
    )
    
    # 4. 성능 벤치마크
    benchmark_results = benchmark_model(ort_model, tokenizer)
    logger.info(f"Optimization complete. Performance: {benchmark_results}")
    
    return {
        "model_path": quantized_model_path,
        "tokenizer_path": output_path,
        "performance": benchmark_results
    }

def benchmark_model(model, tokenizer, num_samples=100):
    """모델 성능 벤치마크"""
    import time
    
    prompt = "인공지능의 미래에 대해 설명해주세요."
    inputs = tokenizer(prompt, return_tensors="pt")
    
    # 워밍업
    for _ in range(10):
        with torch.no_grad():
            model.generate(**inputs, max_length=100, do_sample=False)
    
    # 실제 측정
    start_time = time.time()
    for _ in range(num_samples):
        with torch.no_grad():
            outputs = model.generate(**inputs, max_length=100, do_sample=False)
    
    total_time = time.time() - start_time
    avg_latency = total_time / num_samples
    throughput = num_samples / total_time
    
    return {
        "avg_latency_ms": avg_latency * 1000,
        "throughput_samples_per_sec": throughput,
        "total_samples": num_samples
    }
```

## CI/CD 파이프라인

Jenkins를 활용한 자동화된 배포 파이프라인을 구성했다:

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'registry.x2bee.com'
        KUBECONFIG = credentials('k3s-config')
    }
    
    stages {
        stage('Test') {
            steps {
                script {
                    sh 'docker-compose -f docker-compose.test.yml up --abort-on-container-exit'
                }
            }
        }
        
        stage('Build') {
            parallel {
                stage('Search API') {
                    steps {
                        script {
                            def searchImage = docker.build(
                                "${DOCKER_REGISTRY}/xgen/search-api:${BUILD_NUMBER}",
                                "./search-service"
                            )
                            searchImage.push()
                        }
                    }
                }
                stage('LLM Service') {
                    steps {
                        script {
                            def llmImage = docker.build(
                                "${DOCKER_REGISTRY}/xgen/llm-service:${BUILD_NUMBER}",
                                "./llm-service"
                            )
                            llmImage.push()
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    sh '''
                        helm upgrade --install xgen-stack ./helm-chart \
                            --set searchApi.image.tag=${BUILD_NUMBER} \
                            --set llmService.image.tag=${BUILD_NUMBER} \
                            --namespace xgen \
                            --wait
                    '''
                }
            }
        }
    }
    
    post {
        success {
            slackSend(
                channel: '#xgen-deploy',
                message: "✅ XGEN Stack v${BUILD_NUMBER} 배포 완료"
            )
        }
        failure {
            slackSend(
                channel: '#xgen-deploy',
                message: "❌ XGEN Stack v${BUILD_NUMBER} 배포 실패"
            )
        }
    }
}
```

## 성능 결과

최적화 후 다음과 같은 성능 개선을 확인했다:

### 검색 API 성능
- **응답 시간**: 평균 1.2초 → 0.3초 (75% 개선)
- **동시 처리**: 50 RPS → 200 RPS (4배 향상)
- **메모리 사용량**: 8GB → 3GB (62% 감소)

### LLM 서비스 성능  
- **추론 속도**: 15 tokens/sec → 45 tokens/sec (3배 향상)
- **GPU 메모리**: 12GB → 8GB (33% 절약)
- **Cold start**: 30초 → 5초 (83% 단축)

### 하이브리드 검색 정확도
```python
# 성능 테스트 결과
test_results = {
    "precision_at_5": 0.87,      # 기존: 0.72
    "recall_at_10": 0.94,        # 기존: 0.81  
    "f1_score": 0.90,            # 기존: 0.76
    "avg_query_time": "0.3s"     # 기존: 1.2s
}
```

## 운영 경험과 교훈

### 1. 컨테이너 리소스 관리
GPU 메모리 할당을 세밀하게 조정해야 한다. 초기에 전체 GPU 메모리를 할당했다가 OOM 에러가 빈번히 발생했다.

```yaml
# GPU 메모리 제한 설정
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
    limits:
      memory: 16G
```

### 2. 모델 캐시 전략
모델 로딩 시간을 줄이기 위해 다층 캐시 구조를 적용했다:
- **L1**: Redis 인메모리 캐시 (자주 사용하는 결과)
- **L2**: 로컬 SSD 캐시 (모델 가중치)
- **L3**: 네트워크 스토리지 (전체 모델)

### 3. 모니터링 필수 메트릭
```python
# Prometheus 메트릭 정의
from prometheus_client import Counter, Histogram, Gauge

REQUEST_COUNT = Counter('search_requests_total', 'Total search requests')
REQUEST_LATENCY = Histogram('search_request_duration_seconds', 'Search request latency')
GPU_MEMORY_USAGE = Gauge('gpu_memory_usage_bytes', 'GPU memory usage')
MODEL_LOAD_TIME = Histogram('model_load_duration_seconds', 'Model loading time')
```

## 마무리

이번 프로젝트를 통해 LLMOps 파이프라인의 중요성을 다시 한번 깨달았다. 단순히 모델을 서빙하는 것을 넘어서, 전체 인프라를 코드로 관리하고 자동화하는 것이 장기적으로 훨씬 효율적이다.

특히 Docker 컨테이너화를 통해 개발-스테이징-프로덕션 환경의 일관성을 보장할 수 있었고, 이는 버그 추적과 디버깅에 큰 도움이 되었다.

다음 단계로는 Kubernetes 기반 오토스케일링과 A/B 테스트 자동화를 계획하고 있다. MLOps의 여정은 계속된다! 🚀