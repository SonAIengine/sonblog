집계(Aggregation)는 데이터 규모가 커질수록 집계 성능은 급격히 저하되며, 이로 인해 쿼리 지연(latency)과 리소스 소비가 증가하는 문제가 있습니다. 이를 해결하기 위해 OpenSearch 2.18부터 **신규 기능인 Star-tree Index**가 실험적으로 도입되었습니다.

## Star-tree Index란?
Star-tree Index는 **미리 집계된(Aggregated) 값을 다양한 차원 조합에 따라 저장하는 인덱스 구조**입니다. 기존에는 쿼리 시점에 집계를 수행했지만, Star-tree는 인덱싱 시점에 각 조합별 집계를 미리 계산해 저장하므로, 검색 쿼리 시 빠르게 응답할 수 있습니다.

## 주요 특징

- **멀티 필드 집계 최적화**: 여러 필드의 조합에 대한 집계도 효율적으로 처리
    
- **실시간 동작**: 인덱싱 중 segment flush/refresh 시마다 star-tree 구조 생성
    
- **쿼리 문법 변경 없음**: 기존 쿼리 그대로 사용 가능하며, 자동 최적화 적용
    
- **페이징 및 디스크 I/O 효율 향상**: 적은 리프 탐색으로 빠른 응답 가능


## Star-tree Index 구조

Star-tree는 트리 형태로 구성되며, 다음과 같은 구성요소를 포함합니다:

### Dimension 노드 (ordered_dimensions)

- 예: `status`, `port`, `method`
    
- 트리의 경로를 구성하는 필드들
    

### Metric 노드 (metrics)

- 예: `sum(size)`, `avg(latency)`
    
- 리프 노드에 저장되는 사전 계산된 값들
    

### Star 노드 (`*`)

- 특정 차원에 대해 모든 값을 집계한 노드
    
- 쿼리 조건이 없는 차원을 건너뛸 수 있도록 최적화
    

### Leaf 노드

- 지정된 조합에 대한 최종 metric 값 저장
    
- `max_leaf_docs` 값으로 문서 수 제한 가능


## 🛠️ 설정 예시
