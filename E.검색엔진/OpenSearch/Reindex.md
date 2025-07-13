다음은 OpenSearch에서 `Reindex` 기능을 효과적으로 활용하는 방법을 설명한 블로그 포스트 형식의 글이다. 실무에서 데이터 구조 변경, 필드 추가, 다중 인덱스 병합 등 다양한 상황에 활용할 수 있는 강력한 기능이다.

## OpenSearch에서 Reindex를 활용한 효율적인 데이터 재구성 방법

OpenSearch를 운영하다 보면 인덱스를 처음 만들고 나서 구조를 바꿔야 하는 경우가 종종 발생한다. 예를 들어, 모든 문서에 필드를 하나 추가해야 하거나, 여러 개의 인덱스를 하나로 합쳐야 하는 경우가 이에 해당한다. 이런 작업을 위해 기존 인덱스를 삭제하고 데이터를 오프라인에서 재처리하는 대신, OpenSearch의 `Reindex` 기능을 사용하면 훨씬 효율적으로 작업을 수행할 수 있다.

## Reindex란?

`Reindex`는 한 인덱스의 데이터를 다른 인덱스로 복사하는 기능이다. 전체 문서를 옮길 수도 있고, 특정 쿼리로 필터링된 일부 문서만 선택적으로 복사할 수도 있다. `POST _reindex` 요청으로 수행하며, 복사 대상과 조건을 설정할 수 있다.

## 1. 전체 문서 Reindex

먼저 복사 대상이 될 destination 인덱스를 생성한다.

```json
PUT destination
{
  "mappings": {
    // 원하는 매핑 설정
  },
  "settings": {
    // 원하는 설정
  }
}
```

그다음 source 인덱스의 모든 문서를 destination 인덱스로 복사한다.

```json
POST _reindex
{
  "source": {
    "index": "source"
  },
  "dest": {
    "index": "destination"
  }
}
```

인덱스를 미리 생성하지 않으면 기본 설정으로 자동 생성된다. 다만, 매핑이 중요한 경우에는 사전에 생성해두는 것이 좋다.


## 2. 원격 클러스터에서 Reindex

다른 OpenSearch 클러스터에서 데이터를 복사할 수도 있다. 이때는 `remote` 옵션을 활용한다:

```json
POST _reindex
{
  "source": {
    "remote": {
      "host": "https://<remote_host>:9200",
      "username": "user",
      "password": "pass"
    },
    "index": "remote_index"
  },
  "dest": {
    "index": "local_index"
  }
}
```

원격 연결의 타임아웃, 재시도 횟수(backoff 설정)도 세부 조정할 수 있다.


## 3. 쿼리로 문서 일부만 Reindex

전체 문서가 아니라 조건에 맞는 일부 문서만 복사하고 싶은 경우 `query` 조건을 사용할 수 있다.

```json
POST _reindex
{
  "source": {
    "index": "source",
    "query": {
      "match": {
        "field_name": "value"
      }
    }
  },
  "dest": {
    "index": "destination"
  }
}
```

쿼리는 OpenSearch에서 제공하는 다양한 질의 문법을 사용할 수 있다.

## 4. 여러 인덱스를 하나로 합치기

두 개 이상의 인덱스를 하나로 합치는 것도 가능하다.

```json
POST _reindex
{
  "source": {
    "index": ["source_1", "source_2"]
  },
  "dest": {
    "index": "destination"
  }
}
```

주의할 점은 source와 destination 인덱스의 샤드 개수가 같아야 한다는 것이다.


## 5. 중복되지 않은 문서만 Reindex

destination 인덱스에 이미 존재하는 문서를 제외하고 복사하려면 `op_type: create`를 설정한다. 이때 충돌이 발생해도 무시하려면 `conflicts: proceed`를 함께 사용한다.

```json
POST _reindex
{
  "conflicts": "proceed",
  "source": {
    "index": "source"
  },
  "dest": {
    "index": "destination",
    "op_type": "create"
  }
}
```


## 6. 문서 변형 후 Reindex

Reindex 시 데이터를 변형하려면 `script`를 사용할 수 있다. 예를 들어 특정 숫자 필드를 1씩 증가시키는 경우.

```json
POST _reindex
{
  "source": {
    "index": "source"
  },
  "dest": {
    "index": "destination"
  },
  "script": {
    "lang": "painless",
    "source": "ctx._source.count++"
  }
}
```

또는 미리 정의된 ingest pipeline을 이용해 복잡한 변형도 수행할 수 있다:

```json
PUT _ingest/pipeline/custom-pipeline
{
  "description": "예시 파이프라인",
  "processors": [
    {
      "split": {
        "field": "text",
        "separator": "\\s+",
        "target_field": "word"
      }
    },
    {
      "script": {
        "lang": "painless",
        "source": "ctx.word_count = ctx.word.length"
      }
    },
    {
      "remove": {
        "field": "text"
      }
    }
  ]
}
```

이후 파이프라인을 적용하여 Reindex 수행:

```json
POST _reindex
{
  "source": {
    "index": "source"
  },
  "dest": {
    "index": "destination",
    "pipeline": "custom-pipeline"
  }
}
```

---

## 7. 현재 인덱스 자체 수정: `_update_by_query`

인덱스를 복사하지 않고 현재 인덱스의 데이터를 직접 업데이트하고 싶다면 `_update_by_query` API를 사용한다:

```json
POST my_index/_update_by_query
{
  "script": {
    "source": "ctx._source.count += 1",
    "lang": "painless"
  }
}
```

---

## 성능 및 최적화 팁

- Reindex 작업 전에는 destination 인덱스의 replica 수를 0으로 설정해 불필요한 복제를 방지하고, 완료 후 다시 복구하는 것을 권장한다.
    
- 대용량 데이터는 `slice`를 통해 병렬 처리로 성능을 개선할 수 있다.
    
- `max_docs`, `size` 옵션을 사용해 처리할 문서 개수를 제한할 수도 있다.
    

---

## 마무리

OpenSearch의 Reindex 기능은 단순한 인덱스 복사 기능을 넘어, 데이터 필터링, 변형, 병합까지 다양한 용도로 활용될 수 있다. 구조 변경이 필요한 상황이나 기존 데이터를 새롭게 구성해야 할 때 매우 유용한 도구이므로, 상황에 따라 적절히 활용하면 효율적인 데이터 운영이 가능하다.