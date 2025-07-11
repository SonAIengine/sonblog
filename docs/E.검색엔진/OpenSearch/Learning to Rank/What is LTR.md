OpenSearch의 **Learning to Rank (LTR)** 플러그인은 **검색 결과의 정밀도(관련도)를 머신러닝 기반으로 향상시키는 기능**을 제공한다.

사용자의 클릭 로그, 검색 쿼리, 필드 매칭 등 다양한 피처(feature)를 기반으로 검색 결과를 재정렬(rescore) 하여 더 유의미한 결과를 위로 올려주는 방식이다.

## 🔍 개념 정리: Learning to Rank (LTR)란?

- **기존 검색 시스템**은 keyword match, BM25 등 전통적인 점수 방식에 기반함
    
- LTR은 여기에 **머신러닝 모델**을 적용해, 기존 검색 결과를 재정렬함
    
- 학습된 모델은 예를 들어 "이 문서가 얼마나 클릭됐는가", "쿼리와 어느 필드가 얼마나 잘 맞았는가" 등의 **특징(feature)**을 활용하여 판단함
    

---

## 💡 어떻게 동작하는가?

1. **기본 검색 쿼리 실행** → 후보 문서 반환
    
2. **쿼리 + 문서 기반의 feature 추출** (예: 제목 매칭 여부, 카테고리 일치 여부)
    
3. **사전 학습된 ML 모델**을 이용해 각 문서에 대해 **재점수(rescore)**
    
4. **재정렬된 결과 반환**
    

---

## ✅ 지원하는 모델

- **XGBoost**: gradient boosting 기반의 ML 모델
    
- **RankLib**: Java 기반의 LTR 라이브러리 (LambdaMART, RankNet 등 지원)
    

---

## 🧱 주요 구성 요소

|구성 요소|설명|
|---|---|
|**Feature Set**|문서와 쿼리에서 추출할 feature 정의|
|**Model**|XGBoost 또는 RankLib 기반의 LTR 모델|
|**Rescore Query**|LTR 모델을 적용해 기존 검색 결과를 재정렬하는 쿼리|
|**Training Data**|클릭 로그, 사용자 행동 기반 relevance label이 포함된 학습 데이터|

---

## 📚 시작 가이드

|대상|추천 경로|
|---|---|
|**LTR 처음인 사용자**|[Core Concepts 문서](https://opensearch.org/docs/latest/search-plugins/learning-to-rank/core-concepts/)|
|**빠르게 실습해보고 싶은 경우**|[hello-ltr 데모](https://github.com/o19s/hello-ltr)|
|**이미 익숙한 사용자**|[Plugin 통합 가이드](https://opensearch.org/docs/latest/search-plugins/learning-to-rank/integrate/)|

---

## 🧪 사용 예시

```json
GET /my-index/_search
{
  "query": {
    "match": {
      "title": "opensearch plugin"
    }
  },
  "rescore": {
    "window_size": 100,
    "query": {
      "rescore_query": {
        "ltr": {
          "model": "my-ltr-model",
          "featureset": "my-feature-set"
        }
      }
    }
  }
}
```

---

## 🛠️ 언제 유용한가?

- 클릭/전환 로그가 누적된 **이커머스 검색**
    
- 뉴스/게시글 등에서 **사용자 관심 기반 결과 노출**
    
- 다양한 필드를 가진 문서에 대해 **다양한 가중치 학습 필요**할 때
    

---

## 🔗 참고 링크

- [OpenSearch Learning to Rank 공식 문서](https://opensearch.org/docs/latest/search-plugins/learning-to-rank/)
    
- [hello-ltr GitHub 데모](https://github.com/o19s/hello-ltr)
    
- [OpenSearch LTR plugin 개발 문서](https://github.com/opensearch-project/opensearch-learning-to-rank-base)
    

---

요약하자면, **LTR은 검색 결과의 품질을 "사용자 행동 기반"으로 개선**할 수 있는 고급 기능입니다. OpenSearch에서는 이를 **플러그인 형태로 제공**하며, 실사용에 필요한 학습/적용 파이프라인도 구성할 수 있도록 지원합니다.