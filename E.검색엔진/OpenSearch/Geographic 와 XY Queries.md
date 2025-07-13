OpenSearch는 텍스트 기반 검색뿐 아니라 정교한 지리 공간 검색 기능을 제공한다.  
`geo_point`와 `geo_shape` 필드 설계만 올바르게 해두면 반경 필터링, 복합 도형 분석, 거리 기반 정렬·집계 등 대부분의 위치 기반 요구 사항을 단일 쿼리 또는 집계로 해결할 수 있다.

OpenSearch는 **공간 기반 데이터(위치, 도형 등)** 를 처리할 수 있도록 두 가지 좌표 체계 기반의 쿼리를 제공한다.

- **Geographic Queries**: 지리적(위/경도) 데이터를 위한 쿼리
    
- **XY Queries**: 수학적 2차원 평면(Cartesian 좌표계)을 위한 쿼리

## 1. XY Queries (2차원 평면 좌표계)

**XY Queries**는 Cartesian(직교) 좌표계를 기반으로 도형을 검색한다.  
해당 도형은 다음 필드에 저장된다:

- `xy_point`: 점(point)만 지원
- `xy_shape`: 점, 선(line), 원(circle), 다각형(polygon) 지원

### 지원 관계(Relations)

XY 쿼리는 다음의 공간 관계 중 하나를 기준으로 도형을 검색한다.

- `INTERSECTS` (교차함)
    
- `DISJOINT` (완전히 분리됨)
    
- `WITHIN` (내부에 포함됨)
    
- `CONTAINS` (포함함)

예: 어떤 사각형 도형과 교차하는 점 또는 도형을 가진 문서를 찾기


## 2. Geographic Queries (위/경도 기반 지리 쿼리)

**Geographic Queries**는 위도(latitude), 경도(longitude)를 포함한 **지리적 위치** 기반 데이터를 처리한다.

### 지원 필드 유형

- `geo_point`: 단일 지리 좌표 (위도/경도 점) 지원
    
- `geo_shape`: 점, 선, 원, 다각형 등 복합 지리 도형 지원

### 지원 쿼리 유형

| 쿼리 유형                | 설명                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **Geo-bounding box** | 지정된 사각형(경계 박스) 안에 위치한 `geo_point` 검색                                                         |
| **Geodistance**      | 특정 좌표에서 일정 거리 내에 있는 `geo_point` 검색                                                           |
| **Geopolygon**       | 지정된 다각형 내부에 위치한 `geo_point` 검색                                                               |
| **Geoshape**         | 도형 간의 관계(`INTERSECTS`, `DISJOINT`, `WITHIN`, `CONTAINS`)를 기준으로 `geo_shape` 또는 `geo_point` 검색 |

### 3. Geoshape vs XY 쿼리 비교

| 항목    | Geoshape Query                         | XY Query               |
| ----- | -------------------------------------- | ---------------------- |
| 좌표계   | 지리 좌표계 (위/경도)                          | 2D Cartesian 좌표계       |
| 필드 타입 | `geo_point`, `geo_shape`               | `xy_point`, `xy_shape` |
| 사용 목적 | 지도 기반 데이터 (위치, 영역 등)                   | 2차원 수학/도형 좌표계          |
| 공간 관계 | INTERSECTS, DISJOINT, WITHIN, CONTAINS | 동일한 4가지 지원             |

### 4. 정리 요약

| 항목    | Geographic Query                          | XY Query               |
| ----- | ----------------------------------------- | ---------------------- |
| 좌표 체계 | 지리 (경도/위도)                                | 2D Cartesian           |
| 지원 필드 | `geo_point`, `geo_shape`                  | `xy_point`, `xy_shape` |
| 지원 도형 | 점, 선, 원, 다각형                              | 점, 선, 원, 다각형           |
| 대표 쿼리 | bounding box, distance, polygon, geoshape | xy_shape (도형 관계)       |
| 주요 용도 | 지도, 위치, 거리 기반 검색                          | 기하학적 분석, 시각 좌표 데이터 등   |


이 기능들은 위치 기반 검색, 지도 기반 시각화, CAD 시스템, 이미지 좌표 분석 등 다양한 공간 데이터 활용 시나리오에 유용하다.  
**지도 기반**이면 `geo`, **일반 좌표 기반**이면 `xy`를 사용하면 된다.

## 1. 데이터 준비 – 어떤 형태로 저장해야 하는가

### 1.1 공간 필드 타입

| 필드 타입       | 용도                       | 주요 저장 형식                                                 |
| ----------- | ------------------------ | -------------------------------------------------------- |
| `geo_point` | 단일 위·경도 점                | `"lat,lon"` 문자열, 또는 `{ "lat": 37.57, "lon": 126.98 }` 객체 |
| `geo_shape` | 복잡 도형(점·선·원·다각형·멀티폴리곤 등) | GeoJSON 좌표 배열 `[lon, lat]`, WKT 문자열                      |

### 1.2 예시 매핑

```json
PUT /places
{
  "mappings": {
    "properties": {
      "name"     : { "type": "keyword" },
      "category" : { "type": "keyword" },
      "location" : { "type": "geo_point" },          // 점 검색용
      "boundary" : { "type": "geo_shape" }           // 영역 검색·분석용
    }
  }
}
```

### 1.3 데이터 적재 예시

```json
POST /places/_doc
{
  "name"    : "서울광장",
  "category": "park",
  "location": { "lat": 37.5665, "lon": 126.9780 },
  "boundary": {
    "type": "polygon",
    "coordinates": [[[126.9775,37.5660],[126.9785,37.5660],
                     [126.9785,37.5670],[126.9775,37.5670],
                     [126.9775,37.5660]]]
  }
}
```

---

## 2. 검색 패턴 – 어떤 쿼리를 수행할 수 있는가

|기능|대표 쿼리|설명|비즈니스 질문 예시|
|---|---|---|---|
|사각형 내 검색|`geo_bounding_box`|북서–남동 꼭짓점으로 정의한 박스 내부 점 검색|“강남구 경계 내 편의점만 가져오고 싶다”|
|반경 검색|`geo_distance`|중심 좌표로부터 일정 거리 안 점 검색|“현재 위치 반경 500 m 음식점 표시”|
|다각형 내 검색|`geo_polygon`|임의 다각형 안 점 검색|“행정동 경계 안에 설치된 IoT 센서 목록”|
|공간 관계 필터|`geo_shape` + `relation`|교차·포함·비포함 등 도형 간 관계 검색|“배달 구역 멀티폴리곤과 겹치는 주문 건 조회”|
|거리 정렬|`sort` + `_geo_distance`|검색 결과를 거리순 정렬|“가까운 매장을 순서대로 보여 달라”|
|거리 집계|`geo_distance` aggregation|특정 구간별 버킷 집계|“0–1 km·1–3 km·3–5 km 고객 수 통계”|
|격자 집계|`geohash_grid` aggregation|지도를 타일 단위로 집계|“열지도(Heatmap) 시각화용 방문 수 계산”|

---

## 3. 쿼리 예시와 결과 해석

### 3.1 반경 내 편의점 검색 + 거리순 정렬

```json
GET /places/_search
{
  "query": {
    "bool": {
      "must":   { "term": { "category": "convenience_store" } },
      "filter": {
        "geo_distance": {
          "distance": "500m",
          "location": { "lat": 37.5651, "lon": 126.9896 }
        }
      }
    }
  },
  "sort": [
    {
      "_geo_distance": {
        "location": [126.9896, 37.5651],
        "order"   : "asc",
        "unit"    : "m"
      }
    }
  ],
  "_source": ["name", "location"]
}
```

**결과 해석**  
응답에는 요청 좌표로부터 500 m 안에 위치한 편의점이 거리순으로 정렬되어 반환된다. 클라이언트 애플리케이션은 응답의 `_source.name`, `_source.location`, `sort[0]`(거리 값)을 활용해 지도 표기와 리스트 표기를 동시에 구현할 수 있다.

### 3.2 배달 가능 구역과 겹치지 않는 주문 검색

```json
GET /orders/_search
{
  "query": {
    "geo_shape": {
      "delivery_area": {
        "indexed_shape": {
          "index": "delivery_zones",
          "id"   : "zone_a",
          "path" : "zone"
        },
        "relation": "disjoint"
      }
    }
  }
}
```

**결과 해석**  
`delivery_zones` 인덱스에 등록된 `zone_a` 멀티폴리곤과 **전혀 교차하지 않는**(disjoint) 주문 건을 찾아 반환한다. 운영팀은 이 결과를 기반으로 배달 정책이나 배송 파트너를 재배치할 수 있다.

---

## 4. 결과로 만들 수 있는 산출물

|산출물|활용 예시|구현 포인트|
|---|---|---|
|거리 기반 추천 리스트|“내 주변 1 km 맛집 TOP 10”|`geo_distance` 필터 + 거리 정렬|
|열지도(Heatmap)|관광객 밀집 지역 시각화|`geohash_grid` aggregation 후 버킷 값 시각화|
|영역 커버리지 분석|물류 허브별 서비스 범위 파악|`geo_shape` + `relation` = `contains`|
|경로 분석 리포트|배송 경로가 특정 구역을 얼마나 통과했는지|GPS 로그 → `geo_shape` 라인 저장 → `geo_shape` + `relation` = `intersects`|
|위치 기반 알림 트리거|지정 영역 진입 시 알림|실시간 데이터 스트림에 `geo_shape` 쿼리 적용|

---

## 5. 도입·활용 사례

1. **리테일 O2O 서비스**
    
    - 반경 검색으로 가장 가까운 매장을 추천하고 재고 수량을 실시간 표시한다.
        
    - 매일 새벽 `geohash_grid` 집계로 지역별 주문 밀집도를 분석한다.
        
2. **모빌리티·택시 플랫폼**
    
    - 기사 위치를 `geo_point`로 저장하고, 승객 호출 시 `geo_distance` 쿼리로 배차한다.
        
    - 경로 데이터(라인)를 `geo_shape`로 저장하여 교통 체증 구간을 시각화한다.
        
3. **스마트시티·IoT 인프라**
    
    - 도로 센서 위치를 `geo_point`로 관리하여 특정 행정 구역별 센서 가동률을 집계한다.
        
    - 위험 지역(멀티폴리곤)과 센서 라인의 `intersects` 여부로 사고 감지 정확도를 개선한다.
        
4. **물류·창고 네트워크**
    
    - 창고별 `geo_shape` 서비스 범위를 미리 정의하고, 주문 주소 `geo_point`와 `within` 비교로 자동 라우팅한다.
        
    - 배송 완료 좌표를 수집해 허브별 실제 커버리지와 계획 범위를 비교 분석한다.
        
5. **부동산·공간 분석**
    
    - 매물의 위치와 학군·역세권 등 관심 지역 `geo_shape`를 교차 분석해 우선순위를 산정한다.
        
    - `geo_distance` 집계로 가격 분포를 거리별 버킷으로 나눠 시장 동향을 시각화한다.
    - 