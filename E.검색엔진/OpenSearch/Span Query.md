OpenSearch의 Span Query는 텍스트 토큰의 **위치 정보(position, offset)** 를 활용해 “어떤 단어가 어디에, 어떤 순서와 거리로 등장하는가”를 정밀하게 제어하는 저수준(low-level) 검색 기능이다. 특허·법률·계약서처럼 문맥과 어순이 중요한 도메인에서 강력한 도구가 된다.

## 1. 실습 환경 설정

```json
PUT /clothing
{
  "mappings": {
    "properties": {
      "description": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "stemmed": {           // 어간 추출 버전
            "type": "text",
            "analyzer": "english"
          }
        }
      }
    }
  }
}
```

```json
POST /clothing/_bulk?refresh=true
{ "index": { "_id": 1 } }
{ "description": "Long-sleeved dress shirt with a formal collar and button cuffs." }
{ "index": { "_id": 2 } }
{ "description": "Beautiful long dress in red silk, perfect for formal events." }
{ "index": { "_id": 3 } }
{ "description": "Short-sleeved shirt with a button-down collar, can be dressed up or down." }
{ "index": { "_id": 4 } }
{ "description": "A set of two midi silk shirt dresses with long fluttered sleeves in black." }
```


## 2. Span Query 종류별 설명

### 2-1. span_term – 기본 빌딩 블록

- **목적**: 단일 용어를 위치 정보와 함께 일치
    
- **문법** 

```json
{
  "span_term": {
    "description": "formal"
  }
}
```

- **활용**: 다른 Span 쿼리(near, first 등)의 구성 요소로 사용

### 2-2. span_first – 문서 앞부분 제약

- **목적**: 특정 용어·구가 **필드 시작부** N 토큰 안에 있어야 함

```json
{
  "span_first": {
    "match": { "span_term": { "description.stemmed": "dress" } },
    "end": 4          // 0~3 위치만 허용
  }
}
```

- **활용**: 제목·헤드라인 키워드 검출

### 2-3. span_near – 근접·순서 제어

- **목적**: 여러 용어가 **slop(간격)** 안에서 등장
    
- **파라미터**
    
    - `slop`: 허용 간격(미일치 토큰 수)
        
    - `in_order`: 순서 강제 여부

```json
{
  "span_near": {
    "clauses": [
      { "span_term": { "description.stemmed": "sleev" } },
      { "span_term": { "description.stemmed": "long" } }
    ],
    "slop": 1,
    "in_order": false
  }
}
```

- **활용**: “long sleeve”와 “sleeve long” 모두 허용하며, 사이에 최대 1단어 허용

### 2-4. span_or – OR 논리 결합

- **목적**: 여러 Span 패턴 중 **하나라도** 일치

```json
{
  "span_or": {
    "clauses": [
      { "span_term": { "description": "formal" } },
      { "span_term": { "description": "button" } }
    ]
  }
}
```

- **활용**: 다양한 동의어·변형을 한 번에 허용

### 2-5. span_not – 제외 조건

- **목적**: `include` Span과 **겹치는** 경우를 `exclude`로 제거

```json
{
  "span_not": {
    "include": { "span_term": { "description": "dress" } },
    "exclude": {
      "span_near": {
        "clauses": [
          { "span_term": { "description": "dress" } },
          { "span_term": { "description": "shirt" } }
        ],
        "slop": 0,
        "in_order": true
      }
    }
  }
}
```

- **활용**: “dress”는 검색하되 “dress shirt” 구문은 제외

### 2-6. span_containing / span_within – 포함·포함됨 관계

| 쿼리                | little  | big    | 결과             |
| ----------------- | ------- | ------ | -------------- |
| `span_containing` | 작은 Span | 큰 Span | **큰** Span 반환  |
| `span_within`     | 작은 Span | 큰 Span | **작은** Span 반환 |

```json
// silk·dress 근접(5) span 안에서 red 찾기
{
  "span_containing": {
    "little": { "span_term": { "description": "red" } },
    "big": {
      "span_near": {
        "clauses": [
          { "span_term": { "description": "silk" } },
          { "span_term": { "description": "dress" } }
        ],
        "slop": 5,
        "in_order": false
      }
    }
  }
}
```

- **활용**: 특정 단어가 **특정 문맥** 안에 등장하는지 검증

### 2-7. span_multi – 멀티텀 쿼리 래핑

- **목적**: prefix·wildcard·regexp 등 **Multi-Term Query** 를 Span으로 사용

```json
{
  "span_multi": {
    "match": {
      "prefix": {
        "description": { "value": "dress" }
      }
    }
  }
}
```

- **활용**: “dress*” 패턴과 “sleeve” 변형을 5단어 이내로 제한

### 2-8. field_masking_span – 필드 교차 매칭

- **목적**: 서로 다른 필드 간 Span 조합 가능

```json
{
  "field_masking_span": {
    "query": { "span_term": { "description.stemmed": "sleev" } },
    "field": "description"     // 마스킹 대상
  }
}
```

- **주의**: 점수는 `field`의 norm을 기준으로 계산된다.

## 3. 복합 쿼리 실전 예시

### 3-1. “dress*” 와 “sleeve” 변형이 5단어 이내 (순서 무관)

```json
GET /clothing/_search
{
  "query": {
    "span_near": {
      "clauses": [
        {
          "span_multi": {
            "match": { "prefix": { "description": { "value": "dress" } } }
          }
        },
        {
          "field_masking_span": {
            "query": { "span_term": { "description.stemmed": "sleev" } },
            "field": "description"
          }
        }
      ],
      "slop": 5,
      "in_order": false
    }
  }
}
```

- **결과**: 문서 1(“dress … sleeved”), 문서 4(“dresses … sleeves”) 매칭
    

### 3-2. 문서 앞 4토큰 내 “dress” 등장 & “formal” 근접

```json
{
  "span_near": {
    "clauses": [
      {
        "span_first": {
          "match": { "span_term": { "description.stemmed": "dress" } },
          "end": 4
        }
      },
      { "span_term": { "description": "formal" } }
    ],
    "slop": 3,
    "in_order": true
  }
}
```


## 4. 활용 시나리오

| 도메인    | 요구                                  | Span Query 전략                                         |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| 특허 검색  | 청구항에서 A·B 키워드가 특정 거리·순서로 등장         | `span_near`, `span_not`                               |
| 계약서 검증 | “unless”가 포함되지 않은 “terminate” 문장 찾기 | `span_not` (`include` terminate, `exclude` unless 근접) |
| e-커머스  | 소재·색상·품목 조합(“red silk dress”) 타깃    | `span_containing`                                     |
| 의료 논문  | 약물명과 질병명이 같은 문장에 등장                 | 문장 토큰화 후 `span_near`                                  |
| 검색 랭킹  | 제목 앞부분 키워드 가중치                      | `span_first` + boost                                  |

