OpenSearch 2.11부터 도입된 **Hybrid Search(하이브리드 검색)** 기능은 키워드 기반 검색과 시맨틱(의미 기반) 검색을 결합하여 보다 정밀하고 유연한 검색 결과를 제공할 수 있게 해줍니다. 이 글에서는 하이브리드 검색의 개념부터 자동화된 설정 방법, 수동 설정 방식까지 전 과정을 상세히 소개합니다.

## 하이브리드 검색이란?

하이브리드 검색은 전통적인 키워드 검색(Query DSL 기반)과 신경망 임베딩을 활용한 의미 기반 검색(Neural Search)의 결과를 결합하여 검색 정확도를 향상시키는 방식이다.

이를 위해 OpenSearch는 **search pipeline**을 통해 쿼리 실행 중간 결과를 가로채고 점수(score)를 조정하거나 재정렬하는 방식으로 동작합니다.

### 제공되는 Processor 유형

| Processor 종류            | 도입 버전 | 설명                                          |
| ----------------------- | ----- | ------------------------------------------- |
| Normalization Processor | 2.10  | 여러 쿼리 결과의 점수를 정규화 및 결합 (예: min-max, mean 등) |
| Score Ranker Processor  | 2.19  | 랭크 기반 결과를 결합하는 Rank Fusion 기법 사용            |

## 사전 준비

하이브리드 검색을 사용하려면 먼저 텍스트 임베딩 모델(text embedding model)이 설정되어 있어야 한다.
이미 벡터 임베딩이 생성된 상태라면 바로 검색 파이프라인 구축으로 넘어갈 수 있습니다.


## 구성 방법

하이브리드 검색 설정은 두 가지 방식으로 구성할 수 있다.

### 1. 자동화 워크플로우 (추천)

OpenSearch에서 제공하는 `hybrid_search` 템플릿을 활용하여 다음을 자동 생성할 수 있다.

- Ingest pipeline (텍스트 임베딩 처리)
    
- Vector index
    
- Search pipeline

~~~json
POST /_plugins/_flow_framework/workflow?use_case=hybrid_search&provision=true
{
  "create_ingest_pipeline.model_id": "모델_ID"
}
~~~

성공 시 반환되는 workflow_id 로 생성 상태를 확인 할 수 있다.

