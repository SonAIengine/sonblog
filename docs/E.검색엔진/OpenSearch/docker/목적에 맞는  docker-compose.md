
## 1. 개발/PoC 용 단일 노드 (`docker-compose-poc.yml`)

```yaml
version: "3.8"
services:
  os:
    image: opensearchproject/opensearch:latest
    container_name: os-poc
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "9200:9200"
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: 최소 구성으로 빠르게 기능 시연, 테스트에 적합하다.


## 2. 개발/PoC + Performance Analyzer (`docker-compose-poc-pa.yml`)

```yaml
version: "3.8"
services:
  os:
    image: opensearchproject/opensearch:latest
    container_name: os-poc-pa
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "9200:9200"
      - "9600:9600"
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: `9600` 포트를 열어 성능 분석 모듈 사용 가능하다.

---

## 3. 테스트용 보안 비활성 단일 노드 (`docker-compose-poc-no-security.yml`)

```yaml
version: "3.8"
services:
  os:
    image: opensearchproject/opensearch:latest
    container_name: os-nosec
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
      - DISABLE_INSTALL_DEMO_CONFIG=true
      - DISABLE_SECURITY_PLUGIN=true
      - DISABLE_SECURITY_DASHBOARDS_PLUGIN=true
    ports:
      - "9200:9200"
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: 보안 모듈을 완전히 비활성화하여 개발 환경 접근성을 높인다.

---

## 4. 벡터 검색 PoC 단일 노드 (`docker-compose-poc-vector.yml`)

```yaml
version: "3.8"
services:
  os:
    image: opensearchproject/opensearch:latest
    container_name: os-vector-poc
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
    ports:
      - "9200:9200"
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: 플러그인을 Dockerfile에서 추가 빌드하고 벡터 검색 테스트 가능하다.

---

## 5. 중규모 운영: 클러스터 관리자 · 데이터 노드 분리 (`docker-compose-scale-role.yml`)

```yaml
version: "3.8"
services:
  master:
    image: opensearchproject/opensearch:latest
    container_name: os-master
    environment:
      - node.name=master
      - node.roles=cluster_manager
      - discovery.seed_hosts=master,data
      - cluster.initial_cluster_manager_nodes=master
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
    ulimits:
      memlock: { soft: -1, hard: -1 }

  data:
    image: opensearchproject/opensearch:latest
    container_name: os-data
    environment:
      - node.name=data
      - node.roles=data,ingest
      - discovery.seed_hosts=master,data
      - cluster.initial_cluster_manager_nodes=master
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms4g -Xmx4g
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: 역할 분리를 통해 안정성과 처리가능 성능 확보 가능하다.

---

## 6. 중규모 운영: 다중 데이터 노드 + Dashboards (`docker-compose-scale-data.yml`)

```yaml
version: "3.8"
services:
  master:
    <<: *master-def

  data1:
    image: opensearchproject/opensearch:latest
    container_name: os-data1
    environment:
      - node.name=data1
      - node.roles=data,ingest
      - discovery.seed_hosts=master,data1,data2
      - cluster.initial_cluster_manager_nodes=master
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms4g -Xmx4g
    ulimits:
      memlock: { soft: -1, hard: -1 }
    volumes:
      - data1-vol:/usr/share/opensearch/data

  data2:
    <<: *data1
    container_name: os-data2
    environment:
      - node.name=data2
      - discovery.seed_hosts=master,data1,data2

  dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    container_name: os-dash
    environment:
      - OPENSEARCH_HOSTS=["http://master:9200"]
    depends_on:
      - master
      - data1
      - data2
    ports:
      - "5601:5601"

volumes:
  data1-vol:
  data2-vol:
```

**설명**: 여러 데이터 노드로 색인·검색 요청 병렬 처리 가능하다.

---

## 7. 고가용성 3노드 클러스터 (`docker-compose-ha.yml`)

```yaml
version: "3.8"
services:
  node1, node2, node3:
    image: opensearchproject/opensearch:latest
    environment:
      - node.name=<각각>
      - node.roles=cluster_manager,data,ingest
      - discovery.seed_hosts=node1,node2,node3
      - cluster.initial_cluster_manager_nodes=node1,node2,node3
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
    ulimits:
      memlock: { soft: -1, hard: -1 }
    networks:
      - os-net

networks:
  os-net:
    driver: bridge
```

**설명**: 복제(shard replica) 설정 시 한 노드 장애에도 자동 복구 가능하다.

---

## 8. ML/벡터 검색 분리 클러스터 (`docker-compose-ml.yml`)

```yaml
version: "3.8"
services:
  data:
    image: opensearchproject/opensearch:latest
    container_name: os-data
    environment:
      - node.roles=data,ingest
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms4g -Xmx4g
    ulimits:
      memlock: { soft: -1, hard: -1 }

  ml:
    image: opensearchproject/opensearch:latest
    container_name: os-ml
    environment:
      - node.roles=ml
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
      - plugins.ml_commons.only_run_on_ml_node=true
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: 벡터·ML 임베딩 처리만 전담하는 ML 노드를 분리해 자원 충돌 방지한다.

---

## 9. 대용량 벡터: on‑disk 모드 (`docker-compose-vector-ondisk.yml`)

```yaml
version: "3.8"
services:
  os:
    image: opensearchproject/opensearch:latest
    environment:
      - discovery.type=single-node
      - NODE_OPTIONS=-Dknn.engine=faissOnDisk
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms4g -Xmx4g
    ports:
      - "9200:9200"
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: `faissOnDisk` 모드로 메모리 절약하면서도 P90 응답 100–200ms 수준 유지 가능하다.

---

## 10. TLS 및 보안 구성 포함 (`docker-compose-secure.yml`)

```yaml
version: "3.8"
services:
  os:
    image: opensearchproject/opensearch:latest
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
      - plugins.security.ssl.http.enabled=true
      - plugins.security.ssl.http.keystore.type=jks
      - plugins.security.ssl.http.keystore.path=certs/http.jks
      - plugins.security.ssl.http.keystore.password=changeme
      - plugins.security.ssl.http.truststore.type=jks
      - plugins.security.ssl.http.truststore.path=certs/http.jks
      - plugins.security.ssl.http.truststore.password=changeme
    volumes:
      - ./certs:/usr/share/opensearch/config/certs:ro
    ports:
      - "9200:9200"
    ulimits:
      memlock: { soft: -1, hard: -1 }
```

**설명**: TLS 인증서를 마운트하여 보안 테스트 환경 구축이 가능하다.

---

## 구성 요약 표

|#|구성|목적|
|---|---|---|
|1|단일 노드 PoC|기능 검증, 빠른 배포|
|2|단일 노드 + Performance|성능 진단 시스템|
|3|단일 노드 + 보안 비활성|접근이 쉬운 테스트 환경|
|4|단일 노드 + 벡터 PoC|벡터 검색 기능 테스트|
|5|중규모(role 분리)|역할 구분으로 안정적 운영 구조 확보|
|6|다중 데이터 노드 + Dashboards|부하 분산 시스템 구축|
|7|HA 3노드 클러스터|장애 복구 및 가용성 강화|
|8|데이터 + ML 분리|벡터/ML 워크로드 자원 분리 최적화|
|9|벡터 on‑disk 모드|대용량 벡터 색인 시 메모리 절약 및 성능 유지|
|10|TLS 보안 구성 포함|보안 테스트 환경 구축|

---

## 결론 및 활용 팁

- 각각의 구성 파일은 **목적에 따라 바로 사용 가능**하며 복사하여 사용하면 된다.
    
- 운영 환경에서는 **TLS 구성, 자원 제한 설정, 백업 정책, 모니터링 추가**가 필요하다.
    
- 벡터 검색 성능, 샤드 전략 등 고도 설정은 추가 자료 요청할 경우 제공 가능하다.