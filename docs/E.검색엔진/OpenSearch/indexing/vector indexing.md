OpenSearch는 벡터 기반의 검색 기능을 지원하며, 이를 위해 k-NN(k-nearest neighbor) 인덱스를 생성할 수 있다. 

벡터 인덱스는 다양한 검색 방식에 따라 약간의 설정 차이는 있지만, 공통된 핵심 요소를 기반으로 구성된다.

## 1. 벡터 인덱스 생성 개요

벡터 인덱스를 생성하기 위해서는 다음과 같은 기본 단계를 따른다.

```json
PUT /test-index
{
  "settings": {
    "index.knn": true
  },
  "mappings": {
    "properties": {
      "my_vector": {
        "type": "knn_vector",
        "dimension": 3,
        "space_type": "l2",
        "mode": "on_disk",
        "method": {
          "name": "hnsw"
        }     
      }
    }
  }
}
```

### 핵심 단계 요약

1. **k-NN 검색 활성화**  
    `index.knn: true` 설정을 통해 인덱스에 k-NN 검색 기능을 활성화한다.
    
2. **벡터 필드 정의**  
    `knn_vector` 타입의 필드를 정의하고, 해당 필드가 벡터 데이터를 저장하도록 설정한다. 기본적으로 float 벡터이며, 저장 최적화를 위해 byte 또는 binary도 선택 가능하다.
    
3. **벡터 차원 지정**  
    `dimension` 속성은 사용되는 벡터의 차원 수와 일치해야 한다.
    
4. **거리 측정 방식 선택 (선택 사항)**  
    `space_type`을 통해 유사도 측정 방식을 선택할 수 있다. 대표적으로 `l2`(유클리디안 거리) 또는 `cosinesimil`이 있다.
    
5. **저장 최적화 모드 지정 (선택 사항)**  
    `mode` 또는 압축 수준을 선택하여 디스크 사용량 및 성능을 조절할 수 있다.
    
6. **색인화 알고리즘 선택 (선택 사항)**  
    `method` 항목을 통해 `hnsw`, `ivf` 등의 색인화 기법을 사용할 수 있다.
    

## 2. 임베딩 처리 방식에 따른 구현 옵션

임베딩 생성 방식에 따라 두 가지 주요 구현 경로가 존재한다.

| 구현 방식          | 벡터 필드 타입     | 파이프라인 | 변환 방식 | 사용 사례             |
| -------------- | ------------ | ----- | ----- | ----------------- |
| 외부에서 생성된 벡터 저장 | `knn_vector` | 필요 없음 | 직접 삽입 | Raw vector search |
| 인덱싱 중 벡터 자동 생성 | `knn_vector` | 필요함   | 자동 생성 | AI 기반 시맨틱 검색      |

### 2-1. 외부에서 생성된 벡터를 저장하는 경우

기존에 생성된 임베딩 벡터를 인덱스에 저장하는 경우 다음과 같이 설정한다.

```json
PUT /my-raw-vector-index
{
  "settings": {
    "index.knn": true
  },
  "mappings": {
    "properties": {
      "my_vector": {
        "type": "knn_vector",
        "dimension": 3
      }
    }
  }
}
```

이 방식은 벡터를 외부에서 생성한 후 OpenSearch에 삽입하는 방식으로, 모델 추론이 필요한 상황에서는 적합하지 않다.

### 2-2. 인덱싱 중 임베딩을 자동 생성하는 경우

OpenSearch의 ingest pipeline을 통해 텍스트를 임베딩으로 자동 변환할 수 있다. 이때 `text_embedding` 프로세서를 사용하며, 다음과 같이 파이프라인을 정의한다.

```json
PUT /_ingest/pipeline/auto-embed-pipeline
{
  "description": "AI search ingest pipeline that automatically converts text to embeddings",
  "processors": [
    {
      "text_embedding": {
        "model_id": "mBGzipQB2gmRjlv_dOoB",
        "field_map": {
          "input_text": "output_embedding"
        }
      }
    }
  ]
}
```

이후 인덱스를 생성할 때 `default_pipeline`을 지정하여 해당 파이프라인을 사용한다. 벡터 필드의 `dimension` 값은 파이프라인에 사용된 모델의 출력 차원과 일치해야 한다.

```json
PUT /my-ai-search-index
{
  "settings": {
    "index.knn": true,
    "default_pipeline": "auto-embed-pipeline"
  },
  "mappings": {
    "properties": {
      "input_text": {
        "type": "text"
      },
      "output_embedding": {
        "type": "knn_vector",
        "dimension": 768
      }
    }
  }
}
```

이 방식은 벡터 전처리 과정을 자동화하고, 검색 품질을 일정 수준 이상으로 유지하는 데 유리하다.

## 3. 희소 벡터(sparse vector) 지원

OpenSearch는 `dense` 벡터뿐 아니라 `sparse` 벡터도 지원한다. 희소 벡터는 Neural Sparse Search에 사용되며, 메모리 절약 및 효율적인 검색 방식으로 활용될 수 있다.

관련 내용은 [Neural sparse search 공식 문서](https://opensearch.org/docs/latest/search-plugins/neural-search/sparse-search/)를 참고하면 된다.

## 4. 참고 자료 및 다음 단계

- [Preparing vectors](https://opensearch.org/docs/latest/search-plugins/knn/prepare/)
    
- [k-NN vector 필드 설명](https://opensearch.org/docs/latest/search-plugins/knn/index/)
    
- [Methods and engines](https://opensearch.org/docs/latest/search-plugins/knn/methods/)
    

벡터 인덱스 생성 이후에는 실제 데이터를 인덱싱하고 검색을 수행하는 단계로 이어지며, 벡터 인덱스의 설계는 검색 정확도와 성능에 결정적인 영향을 준다. 따라서 용도에 따라 적절한 설정을 선택하는 것이 중요하다.