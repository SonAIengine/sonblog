OpenSearch는 전통적인 BM25 검색뿐 아니라 벡터, 날짜, 지리 정보, 사용자 정의 스크립트 등을 활용해 다양한 랭킹·필터링 시나리오를 지원한다. 그 중심에는 **specialized query**(전용 쿼리) 열 가지가 있다. 본 글에서는 각 쿼리의 목적, 핵심 파라미터, 예시, 추천 사용 시점을 정리하였다. 모든 문장은 설명형 ‘~이다’ 체로 작성되었다.

---

## 1. `distance_feature`

- **용도**: 날짜(`date`, `date_nanos`)나 위치(`geo_point`) 기준으로 ‘가까울수록 점수 상승’ 효과를 준다.
    
- **핵심 파라미터**
    
    - `field`: 대상 필드
        
    - `origin`: 기준점(예: `"now"`, `"37.55,126.97"`)
        
    - `pivot`: 점수 변화의 스케일(예: `"7d"`, `"100km"`)
        
- **JSON 예시**
    
    ```json
    {
      "distance_feature": {
        "field": "publish_date",
        "origin": "now",
        "pivot": "7d"
      }
    }
    ```
    
- **언제 쓸까**
    
    - 최신 뉴스 우선 노출
        
    - 사용자 위치와 가까운 매장 추천
        

---

## 2. `more_like_this`

- **용도**: 입력 텍스트·문서와 유사한 문서를 TF-IDF 기반으로 찾는다.
    
- **핵심 파라미터**
    
    - `fields`, `like`, `min_term_freq`, `min_doc_freq`, `max_query_terms`
        
- **JSON 예시**
    
    ```json
    {
      "more_like_this": {
        "fields": ["title", "body"],
        "like": "vector search acceleration with GPU",
        "min_term_freq": 1,
        "min_doc_freq": 1,
        "max_query_terms": 12
      }
    }
    ```
    
- **언제 쓸까**
    
    - 기사·블로그 추천
        
    - 비슷한 상품 묶음 제안
        

---

## 3. `knn`

- **용도**: `knn_vector` 필드에 저장된 Dense Vector를 k-최근접 이웃 방식으로 검색한다.
    
- **핵심 파라미터**
    
    - `vector`: 쿼리 벡터
        
    - `k`: 반환 수
        
    - `num_candidates`: 후보군 크기
        
- **JSON 예시**
    
    ```json
    {
      "knn": {
        "embedding": {
          "vector": [0.12, 0.35, ...],
          "k": 10,
          "num_candidates": 100
        }
      }
    }
    ```
    
- **언제 쓸까**
    
    - 임베딩 기반 시맨틱 검색
        
    - RAG(Retrieval-Augmented Generation) 문서 후보 수집
        

---

## 4. `neural`

- **용도**: Neural Search 플러그인과 결합해 텍스트·이미지 입력만으로 벡터 검색을 수행한다.
    
- **핵심 파라미터**
    
    - `model_id`, `query_text` 또는 `query_image`, `k`
        
- **JSON 예시**
    
    ```json
    {
      "neural": {
        "embedding": {
          "model_id": "my-ko-sbert",
          "query_text": "20만원 예산의 사진 잘 나오는 스마트폰",
          "k": 50
        }
      }
    }
    ```
    
- **언제 쓸까**
    
    - 모델 ID를 통한 사전·후처리 자동화
        
    - 이미지 유사 검색
        

---

## 5. `neural_sparse`

- **용도**: 토큰-가중치 쌍으로 표현한 Sparse Embedding을 역색인 방식으로 검색한다.
    
- **핵심 파라미터**
    
    - `model_id`, `query_text` 또는 `query_tokens`, `k`
        
- **JSON 예시**
    
    ```json
    {
      "neural_sparse": {
        "sparse": {
          "model_id": "splade-ko",
          "query_text": "best budget camera phone",
          "k": 100
        }
      }
    }
    ```
    
- **언제 쓸까**
    
    - 메모리 부담을 줄이면서 의미 기반 검색
        
    - 대규모 컬렉션에서 BM25와 혼합
        

---

## 6. `percolate`

- **용도**: 인덱스에 저장된 ‘쿼리 문서’와 새로 주어지는 문서를 역방향으로 매칭한다.
    
- **작동 방식**
    
    1. 쿼리를 문서로 인덱싱
        
    2. 검색 단계에서 `field`와 `document` 지정
        
- **JSON 예시**
    
    ```json
    {
      "percolate": {
        "field": "my_perc",
        "document": {
          "title": "신형 스마트폰 출시",
          "body":  "120Hz OLED, 5,000mAh 배터리"
        }
      }
    }
    ```
    
- **언제 쓸까**
    
    - 알림·구독 서비스
        
    - 룰 기반 필터링 엔진
        

---

## 7. `rank_feature`

- **용도**: 숫자형 피처 값을 점수로 변환해 랭킹에 반영한다.
    
- **핵심 파라미터**
    
    - `field`, 선택적으로 `log`, `saturation`, `linear` 스케일링
        
- **JSON 예시**
    
    ```json
    {
      "bool": {
        "must": { "match": { "title": "갤럭시" } },
        "should": [
          { "rank_feature": { "field": "sales_score", "log": { "scaling_factor": 2 } } },
          { "rank_feature": { "field": "review_score" } }
        ]
      }
    }
    ```
    
- **언제 쓸까**
    
    - 판매량·클릭률 가중치
        
    - 피처 엔지니어링 기반 랭킹
        

---

## 8. `script`

- **용도**: Painless 스크립트로 ‘필터’ 조건을 자유롭게 정의한다.
    
- **핵심 파라미터**
    
    - `script.source`, `script.params`
        
- **JSON 예시**
    
    ```json
    {
      "script": {
        "script": {
          "source": "doc['price'].value < params.max",
          "params": { "max": 200000 }
        }
      }
    }
    ```
    
- **언제 쓸까**
    
    - 복합 비교, 배열 연산 등 정형 쿼리로 표현하기 어려운 필터
        

---

## 9. `script_score`

- **용도**: 쿼리 결과에 사용자 정의 점수를 적용한다.
    
- **핵심 파라미터**
    
    - `query`: 기본 검색
        
    - `script.source`: 점수 계산식
        
- **JSON 예시**
    
    ```json
    {
      "script_score": {
        "query": { "match_all": {} },
        "script": {
          "source": "cosineSimilarity(params.qv, doc['embedding']) + 1.0",
          "params": { "qv": [0.2, 0.8, ...] }
        }
      }
    }
    ```
    
- **언제 쓸까**
    
    - 벡터 점수와 BM25 점수 혼합
        
    - 사용자의 개인화 가중치 적용
        

---

## 10. `wrapper`

- **용도**: Base64 인코딩 문자열 형태로 쿼리를 전달한다. 외부 시스템 제약으로 ‘문자열만 허용’되는 환경에서 유용하다.
    
- **JSON 예시**
    
    ```json
    {
      "wrapper": {
        "query": "eyAicXVlcnkiOiB7ICJtYXRjaCI6IHsgImZpZWxkIjogInZhbHVlIiB9IH0gfQ=="
      }
    }
    ```
    
- **언제 쓸까**
    
    - Spring Data @Query 등 문자열 기반 DSL 필요 환경
        
    - 가독성은 낮으므로 필요할 때만 사용
        

---

## 상황별 쿼리 선택 가이드

|시나리오|적합 쿼리|
|---|---|
|최신·근접성 강조|`distance_feature`|
|유사 문서 추천|`more_like_this`|
|임베딩 기반 시맨틱 검색|`knn`, `neural`|
|메모리 절감형 의미 검색|`neural_sparse`|
|새 문서 알림·룰 엔진|`percolate`|
|인기도·CTR 가중치|`rank_feature`|
|복잡한 필터 로직|`script`|
|사용자 정의 랭킹 함수|`script_score`|
|문자열만 허용되는 환경|`wrapper`|

---

## 마무리

Specialized Query를 적절히 조합하면 **벡터·BM25·도메인 피처**를 통합한 하이브리드 검색 파이프라인을 구축할 수 있다. 시스템 요구사항(정확도, 지연 시간, 메모리)을 고려해 각 쿼리의 특성을 선택적으로 활용하는 전략이 핵심이다. 이 가이드를 바탕으로 프로젝트에 맞는 최적의 검색 구성을 설계해 보기 바란다.