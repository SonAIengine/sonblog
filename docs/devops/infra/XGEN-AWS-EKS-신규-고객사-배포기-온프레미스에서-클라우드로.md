---
title: "XGEN AWS EKS 신규 고객사 배포기 — 온프레미스에서 클라우드로"
description: "온프레미스 K3s에서 운영하던 XGEN 2.0 플랫폼을 AWS EKS 기반 신규 고객사 환경에 배포한 과정을 정리한다. 멀티 고객사 아키텍처가 실제로 통하는지 검증하고, 레지스트리 분리, MinIO에서 S3 전환, 하드코딩 제거까지 트러블슈팅 과정을 기록한다."
date: 2026-02-20
tags:
  - AWS
  - EKS
  - ArgoCD
  - Jenkins
  - Kubernetes
  - Nexus
  - S3
  - XGEN
  - GitOps
  - 멀티테넌시
---

# XGEN AWS EKS 신규 고객사 배포기 — 온프레미스에서 클라우드로

## 배경 — "yaml 하나면 끝"이 진짜인가

XGEN 2.0은 AI Agent 플랫폼이다. 지금까지는 온프레미스 K3s 클러스터에서 운영했고, 고객사(롯데이마트 등)에도 같은 온프레미스 구조로 배포했다. 이전 글 "[ArgoCD 멀티 고객사 배포 아키텍처](ArgoCD-멀티-고객사-배포-아키텍처-ApplicationSet-시행착오와-단일-진입점-설계.md)"에서 `projects/*.yaml` 단일 진입점 구조를 만들었고, 당시 결론은 이랬다:

> 새 고객사 추가: `projects/newcustomer.yaml` 하나 만들고, Root App yaml 하나 등록하면 끝

그런데 새로운 고객사(이하 AWW)는 상황이 달랐다. **AWS 위에서 EKS로 운영해야 했다.** 지금까지 온프레미스끼리만 배포했는데, 처음으로 클라우드 환경이 들어온 것이다.

온프레미스와 AWS의 차이점은 생각보다 많았다:

- **이미지 레지스트리**: 온프레미스 Nexus가 아니라 AWS 내부 Nexus를 써야 한다
- **오브젝트 스토리지**: 자체 MinIO 대신 AWS S3를 사용해야 한다
- **Git 레포지토리**: 온프레미스 GitLab이 아니라 AWS 내부 GitLab에서 ArgoCD가 소스를 가져온다
- **인프라 서비스**: PostgreSQL, Redis, Qdrant가 별도 관리 서버에서 Docker Compose로 운영되고, EKS와 VPC Peering으로 연결된다
- **빌드 파이프라인**: 온프레미스 Jenkins에서 빌드하되, 이미지는 AWS Nexus로 push해야 한다

"yaml 하나면 끝"이 정말 통하는지, 아키텍처의 첫 실전 테스트가 시작됐다.

## AWW 배포 아키텍처

```mermaid
flowchart LR
    subgraph OnPrem["온프레미스"]
        Jenkins["Jenkins<br/>빌드 서버"]
        GitLab["GitLab<br/>소스 저장소"]
    end

    subgraph AWS["AWS ap-northeast-2"]
        subgraph EKS["EKS Cluster"]
            ArgoCD["ArgoCD"]
            FE["xgen-frontend"]
            GW["xgen-backend-gateway"]
            Core["xgen-core"]
            WF["xgen-workflow"]
            Doc["xgen-documents"]
            MCP["xgen-mcp-station"]
        end

        AWSGitLab["AWS GitLab<br/>ArgoCD 소스"]
        AWSNexus["AWS Nexus<br/>이미지 레지스트리"]
        S3["S3 Bucket"]

        subgraph MgmtServer["관리 서버"]
            PG["PostgreSQL"]
            Redis["Redis"]
            Qdrant["Qdrant"]
        end
    end

    Jenkins -->|"docker push"| AWSNexus
    GitLab -->|"git mirror"| AWSGitLab
    ArgoCD -->|"git poll"| AWSGitLab
    ArgoCD -->|"deploy"| FE & GW & Core & WF & Doc & MCP
    EKS <-->|"VPC Peering"| MgmtServer
    Doc -->|"문서 저장"| S3
```

핵심 포인트는 **빌드는 온프레미스, 배포는 AWS**라는 이중 구조다. AWS에 별도 Jenkins가 있었지만 XGEN 전용이 아니어서 사용할 수 없었다. 온프레미스 Jenkins에서 이미지를 빌드하고 AWS Nexus로 push하는 구조를 택했다.

## 통한 것 — xgen-aww.yaml 단일 진입점

결론부터 말하면, 큰 틀에서는 통했다. `projects/xgen-aww.yaml` 파일 하나에 AWW 환경의 모든 배포 설정을 정의할 수 있었다:

```yaml
# k3s/argocd/projects/xgen-aww.yaml
project:
  name: xgen
  description: "xgen2.0 Platform (AWW)"
  namespace: xgen

source:
  repoURL: http://<aws-gitlab-host>/xgen/xgen-infra.git  # AWS 내부 GitLab
  targetRevision: main

destinations:
  aww:
    server: https://kubernetes.default.svc
    domain: ""

site: aww
registryHost: "<aws-nexus-host>:5000"

vars:
  APP_SITE: "xgen-aww"
  AWS_REGION: "ap-northeast-2"
  S3_BUCKET: "xgen-aww"
  S3_DOCUMENT_BUCKET: "xgen-aww"
  MINIO_DOCUMENT_BUCKET: "xgen-aww"
  MINIO_SECURE: "true"

infra:
  postgres:
    host: "<mgmt-server-ip>"
  redis:
    host: "<mgmt-server-ip>"
  qdrant:
    host: "<mgmt-server-ip>"
  minio:
    endpoint: "https://s3.ap-northeast-2.amazonaws.com"

environments:
  aww:
    services:
      - name: xgen-frontend
        hasDomain: true
        replicas: 1
        autoscaling: { minReplicas: 1, maxReplicas: 2 }
        resources:
          requests: { memory: "256Mi", cpu: "100m" }
          limits:   { memory: "1Gi",   cpu: "500m" }
      # ... 6개 서비스 정의
```

```
# 커밋: feat: AWW EKS 배포용 ArgoCD 프로젝트 설정 추가
# 날짜: 2026-02-20 18:18
```

온프레미스 `xgen.yaml`과 비교하면 차이점이 명확하다:

| 항목 | xgen.yaml (온프레미스) | xgen-aww.yaml (AWS) |
|------|----------------------|---------------------|
| source.repoURL | 온프레미스 GitLab | AWS 내부 GitLab |
| registryHost | 미설정 (기본값) | AWS Nexus 주소 |
| infra | 빈 값 (K3s 내장) | 관리 서버 IP |
| minio.endpoint | 빈 값 (K3s MinIO) | S3 엔드포인트 |
| vars | APP_SITE만 | S3 버킷 + 리전 추가 |

`source`, `infra`, `vars` 같은 섹션이 이미 설계되어 있어서, 값만 채우면 동작하는 구조였다. 아키텍처 설계 단계에서 "고객사별로 다를 수 있는 것"을 변수로 뽑아놓은 게 여기서 빛을 발했다.

하지만 **그 변수가 충분하지 않았다.** 온프레미스끼리만 배포하다 보니, "당연히 같을 거라고 전제한 것"들이 있었다. 여기서부터가 트러블슈팅이다.

## 트러블슈팅 1 — 레지스트리가 하나뿐이다

### 증상

Jenkins에서 AWW용 이미지를 빌드한 후 push할 곳이 없었다. 기존 파이프라인은 Nexus 레지스트리 주소가 `project.yaml`에 하나만 정의되어 있었다:

```yaml
# k3s/jenkins/config/project.yaml (변경 전)
registry:
  nexus:
    host: "docker.x2bee.com"       # 모든 사이트가 이 하나를 공유
    credentialId: "nexus-credentials"
```

AWW 고객사는 자체 Nexus 레지스트리를 운영한다. 같은 `docker.x2bee.com`에 push할 수 없고, AWW 전용 레지스트리로 보내야 했다.

### 원인

멀티 고객사 구조를 만들 때, "레지스트리는 하나"라는 전제가 깔려 있었다. 온프레미스 고객사들은 전부 같은 Nexus를 공유했으니 문제가 안 됐는데, AWS 고객사는 물리적으로 다른 레지스트리를 쓴다.

### 해결 — siteRegistries 오버라이드

`project.yaml`에 사이트별 레지스트리 오버라이드 섹션을 추가했다:

```yaml
# k3s/jenkins/config/project.yaml
registry:
  nexus:
    host: "docker.x2bee.com"          # 기본값
    credentialId: "nexus-credentials"
  local:
    host: "localhost:30500"

sites:
  - main
  - lotteimall
  - aww

# 사이트별 레지스트리 오버라이드
# 여기에 없는 사이트는 registry.nexus 기본값 사용
siteRegistries:
  aww:
    host: "<aww-nexus-host>:5000"
    credentialId: "aww-nexus-credentials"
```

```
# 커밋: feat: AWW 사이트 배포 지원 (사이트별 Nexus 레지스트리 분리)
# 날짜: 2026-02-20 06:36
```

Jenkins 파이프라인에서 이 오버라이드를 처리하는 로직:

```groovy
// k3s/jenkins/build.groovy (Config 스테이지)
def projectConfig = readYaml file: 'k3s/jenkins/config/project.yaml'

// 사이트별 레지스트리 오버라이드 확인
def siteReg = projectConfig.siteRegistries?.get(params.SITE)
if (siteReg) {
    env.NEXUS_REGISTRY = siteReg.host
    env.NEXUS_CRED = siteReg.credentialId
} else {
    env.NEXUS_REGISTRY = projectConfig.registry.nexus.host
    env.NEXUS_CRED = projectConfig.registry.nexus.credentialId
}
```

`siteRegistries`에 해당 사이트가 있으면 그 레지스트리를 사용하고, 없으면 기본값을 쓴다. 기존 `main`이나 `lotteimall`은 `siteRegistries`에 엔트리가 없으므로 영향 없이 기본 레지스트리를 계속 사용한다. 이미지 경로도 자연스럽게 분리된다:

```
# 기존 (main 사이트)
docker.x2bee.com/xgen/main/xgen-frontend:latest-amd64

# AWW 사이트
<aww-nexus-host>:5000/xgen/aww/xgen-frontend:latest-amd64
```

## 트러블슈팅 2 — registryHost 파라미터가 없다

### 증상

Jenkins에서 AWW Nexus로 이미지를 push하는 건 해결했다. 그런데 ArgoCD 쪽에서 문제가 생겼다. EKS에 배포된 Pod가 이미지를 pull할 때, 레지스트리 호스트가 온프레미스 기본값(`docker.x2bee.com`)으로 잡혔다.

### 원인

기존 Helm 템플릿(`application.yaml`)은 `site`(이미지 경로의 사이트 부분)만 오버라이드할 수 있었다. 레지스트리 호스트 자체를 바꾸는 파라미터는 없었다. 온프레미스 고객사끼리는 호스트가 같으니 `site`만 바꾸면 됐는데, AWS는 호스트부터 다르다.

### 해결 — registryHost 파라미터 추가

ArgoCD Helm 템플릿에 `registryHost` 오버라이드를 추가했다:

```yaml
# k3s/argocd/templates/application.yaml (추가된 부분)
{{- if $.Values.site }}
- name: global.registry.site
  value: {{ $.Values.site | quote }}
{{- end }}
{{- if $.Values.registryHost }}
- name: global.registry.host
  value: {{ $.Values.registryHost | quote }}
{{- end }}
```

이제 `projects/xgen-aww.yaml`에서 `registryHost: "<aws-nexus-host>:5000"`을 선언하면, 해당 고객사의 모든 서비스가 AWS Nexus에서 이미지를 pull한다. 기존 고객사 yaml에는 `registryHost`가 없으므로 기본값(`docker.x2bee.com`)이 그대로 사용된다.

## 트러블슈팅 3 — MinIO 하드코딩이 S3에서 터졌다

이번 AWW 배포에서 가장 뼈아픈 문제였다.

### 증상

xgen-documents 서비스가 AWS 환경에서 파일 업로드/다운로드에 실패했다. S3 버킷에 접근하지 못하고, MinIO 관련 에러가 발생했다.

### 원인

xgen-documents는 `.env` 파일 기반으로 설정을 읽는 Python 앱이다. Kubernetes에서는 컨테이너 시작 시 `sed`로 `.env` 파일의 값을 오버라이드하는 방식을 썼는데, **MinIO 인증 정보가 하드코딩**되어 있었다:

```yaml
# k3s/helm-chart/values/xgen-documents.yaml (변경 전)
command:
  - /bin/sh
  - -c
  - |
    sed -i 's/MINIO_DATA_ACCESS_KEY=.*/MINIO_DATA_ACCESS_KEY=minio/' /app/.env
    sed -i 's/MINIO_DATA_SECRET_KEY=.*/MINIO_DATA_SECRET_KEY=minio123/' /app/.env
    sed -i 's|MINIO_ENDPOINT=.*|MINIO_ENDPOINT=http://minio.xgen-system.svc.cluster.local:9000|' /app/.env
    exec python main.py
```

온프레미스 MinIO 인증(`minio / minio123`)과 엔드포인트가 직접 박혀 있었다. 온프레미스에서는 이게 동작했지만, AWS S3에서는 IAM 키가 필요하고 엔드포인트도 다르다. 하드코딩이 환경 전환의 순간에 터진 것이다.

```
# 커밋: fix: xgen-documents MinIO 하드코딩 제거 + AWW 배포 가이드 재구성
# 날짜: 2026-02-20 12:26
```

### 해결 — 환경변수 참조로 전환

고정값을 환경변수 참조로 바꿨다:

```yaml
# k3s/helm-chart/values/xgen-documents.yaml (변경 후)
command:
  - /bin/sh
  - -c
  - |
    sed -i "s|MINIO_ENDPOINT=.*|MINIO_ENDPOINT=${MINIO_ENDPOINT}|" /app/.env
    sed -i "s/MINIO_DATA_ACCESS_KEY=.*/MINIO_DATA_ACCESS_KEY=${MINIO_DATA_ACCESS_KEY}/" /app/.env
    sed -i "s/MINIO_DATA_SECRET_KEY=.*/MINIO_DATA_SECRET_KEY=${MINIO_DATA_SECRET_KEY}/" /app/.env
    sed -i "s/MINIO_DOCUMENT_BUCKET=.*/MINIO_DOCUMENT_BUCKET=${MINIO_DOCUMENT_BUCKET}/" /app/.env
    sed -i "s/MINIO_SECURE=.*/MINIO_SECURE=${MINIO_SECURE}/" /app/.env
    exec python main.py
```

변경 포인트:

- 작은따옴표(`'`) → 큰따옴표(`"`): 셸 변수 확장이 동작하도록
- 고정값(`minio`, `minio123`) → 환경변수 참조(`${MINIO_DATA_ACCESS_KEY}`)
- `MINIO_DOCUMENT_BUCKET`, `MINIO_SECURE` 추가: S3 사용 시 버킷명과 HTTPS 설정 필요

환경변수의 출처는 두 계층이다:

1. **ConfigMap** — `projects/xgen-aww.yaml`의 `vars` 섹션에서 `MINIO_DOCUMENT_BUCKET`, `MINIO_SECURE` 주입
2. **Secret** — `xgen-secrets`에서 `MINIO_DATA_ACCESS_KEY`, `MINIO_DATA_SECRET_KEY` 주입

### S3 연동 — MinIO SDK의 호환성

```
# 커밋: feat: AWW S3 연동 설정 (MinIO → S3 전환)
# 날짜: 2026-02-20 13:02
```

xgen-aww.yaml에서 엔드포인트와 관련 변수를 S3용으로 설정한다:

```yaml
infra:
  minio:
    endpoint: "https://s3.ap-northeast-2.amazonaws.com"

vars:
  MINIO_DOCUMENT_BUCKET: "xgen-aww"
  MINIO_SECURE: "true"
```

결과적으로 **xgen-documents 코드는 한 줄도 바꾸지 않았다.** MinIO SDK가 S3 호환이기 때문에, 엔드포인트와 인증 정보만 바꾸면 S3와 통신한다. 단, `MINIO_SECURE: "true"`를 빠뜨리면 HTTP로 S3에 접근하려다 실패하니 주의가 필요하다.

환경변수가 Pod까지 전달되는 흐름:

```
xgen-aww.yaml (vars/infra)
  → ArgoCD application.yaml 템플릿 (helm parameters로 변환)
    → 서비스별 Helm 차트 (ConfigMap/Secret 생성)
      → Pod 환경변수로 주입
        → xgen-documents의 sed 스크립트가 .env 파일에 반영
```

## 트러블슈팅 4 — 리소스 과할당

### 증상

AWW EKS에 6개 서비스를 배포했는데, 노드 리소스를 과하게 점유했다. 초기 트래픽이 거의 없는 상태에서 불필요한 비용이 발생했다.

### 원인

온프레미스 prd 설정(`replicas: 2, minReplicas: 2, maxReplicas: 4`)을 그대로 복사해서 가져왔다. 온프레미스는 자체 서버니까 replicas 2가 부담이 아니지만, EKS는 노드 수 = 비용이다.

```
# 커밋: feat: AWW 리소스 설정 조정 (replicas 2→1)
# 날짜: 2026-02-20 20:04
```

### 해결 — replicas 축소 + autoscaling 재설정

모든 서비스를 `replicas: 1, minReplicas: 1, maxReplicas: 2`로 조정했다:

```
# 커밋: fix: AWW autoscaling minReplicas 1로 설정
# 날짜: 2026-02-20 20:10
```

```yaml
# xgen-aww.yaml (최종 리소스 설정)
environments:
  aww:
    services:
      - name: xgen-frontend
        replicas: 1
        autoscaling: { minReplicas: 1, maxReplicas: 2 }
        resources:
          requests: { memory: "256Mi", cpu: "100m" }
          limits:   { memory: "1Gi",   cpu: "500m" }

      - name: xgen-core
        replicas: 1
        autoscaling: { minReplicas: 1, maxReplicas: 2 }
        resources:
          requests: { memory: "512Mi", cpu: "200m" }
          limits:   { memory: "4Gi",   cpu: "1000m" }

      - name: xgen-documents
        replicas: 1
        autoscaling: { minReplicas: 1, maxReplicas: 2 }
        resources:
          requests: { memory: "1Gi",  cpu: "500m" }
          limits:   { memory: "16Gi", cpu: "4000m" }
      # ... 6개 서비스 모두 동일 패턴
```

평소에는 1개로 운영하되, 부하 시 2개까지 스케일아웃되는 구조다. 온프레미스 prd(`minReplicas: 2, maxReplicas: 4`)의 절반 수준이다.

## 선행 작업이 살렸다 — Nexus 인증 기반

AWW 트러블슈팅이 이 정도에서 끝난 건, 사실 선행 작업이 있었기 때문이다.

AWW 작업 전에 온프레미스 레지스트리를 `localhost:30500`(K3s 내장, 인증 없음)에서 `docker.x2bee.com`(Nexus, 인증 필요)으로 전환하면서 인증 기반을 다져놓았다:

```
# 커밋: fix: Nexus 인증 대응 - imagePullSecrets 추가
# 날짜: 2026-02-12 16:36
```

```
# 커밋: fix: Docker Registry를 Nexus(docker.x2bee.com)로 변경
# 날짜: 2026-02-17 17:36
```

Deployment 템플릿에 `imagePullSecrets`를 추가한 것이 핵심이다:

```yaml
# k3s/helm-chart/templates/deployment.yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: registry-credentials
      containers:
        - name: {{ include "xgen-service.name" . }}
          image: {{ include "xgen-service.image" . }}
```

이 작업이 온프레미스에서 먼저 되어 있었기 때문에, AWW EKS에서도 `registry-credentials` Secret만 생성하면 바로 이미지를 pull할 수 있었다. 만약 이 선행 작업 없이 AWW 배포를 시작했다면, "레지스트리 인증이 안 된다"는 문제까지 겹쳐서 훨씬 복잡했을 것이다.

## 최종 배포 파이프라인

모든 트러블슈팅을 거친 후, AWW 배포 시 데이터가 흐르는 최종 경로:

```mermaid
flowchart LR
    Dev["개발자<br/>코드 push"]
    GL["온프레미스 GitLab"]
    JK["Jenkins"]
    NX["AWS Nexus"]
    AGL["AWS GitLab"]
    Argo["EKS ArgoCD"]
    K8s["EKS Pods"]

    Dev -->|"git push<br/>(aww 브랜치)"| GL
    GL -->|"webhook"| JK
    JK -->|"docker build<br/>+ push"| NX
    GL -->|"git mirror"| AGL
    Argo -->|"git poll"| AGL
    Argo -->|"helm template<br/>+ deploy"| K8s
    K8s -->|"image pull"| NX
```

1. 개발자가 `aww` 브랜치에 코드를 push한다
2. Jenkins가 `SITE=aww`로 트리거되어 이미지를 빌드하고, `siteRegistries.aww.host`로 push한다
3. xgen-infra가 AWS GitLab에 미러링된다
4. EKS의 ArgoCD가 AWS GitLab을 polling하다가 변경을 감지한다
5. `projects/xgen-aww.yaml` 설정에 따라 6개 서비스를 배포한다
6. Pod가 `registryHost`에 지정된 AWS Nexus에서 이미지를 pull한다

## 정리

### 결국 통했나

통했다. 하지만 "yaml 하나면 끝"은 절반만 맞았다.

`projects/*.yaml` 단일 진입점 구조 자체는 유효했다. AWW의 모든 배포 설정 — 6개 서비스의 리소스, 환경변수, 인프라 주소, 레지스트리 — 이 `xgen-aww.yaml` 한 파일에 들어있다. 구조가 없었으면 서비스마다 yaml을 따로 만들어야 했을 것이다.

문제는 **구조 안의 빈칸**이었다. 레지스트리 호스트 오버라이드(`registryHost`), 사이트별 빌드 레지스트리(`siteRegistries`), MinIO 하드코딩 제거 — 이것들은 아키텍처 설계 시점에 예상하지 못한 변수다. 온프레미스끼리만 배포하면 드러나지 않는, 환경이 바뀌어야만 보이는 구멍이었다.

### 수정한 파일 목록

AWW 고객사를 추가하면서 실제로 수정한 파일:

| 파일 | 변경 내용 |
|------|----------|
| `projects/xgen-aww.yaml` | 신규 생성 — AWW 전체 설정 |
| `project.yaml` | `siteRegistries.aww` 추가 |
| `build.groovy` | siteRegistries 분기 로직 |
| `build-all.groovy` | SITE choices에 aww 추가 |
| `application.yaml` (Helm 템플릿) | `registryHost` 파라미터 추가 |
| `xgen-documents.yaml` (Helm values) | MinIO 하드코딩 → 환경변수 참조 |

처음 기대한 "파일 1~2개 수정"보다는 많지만, 6개 마이크로서비스 전체를 새 환경에 배포한 것 치고는 적다. 그리고 `application.yaml`과 `xgen-documents.yaml`의 수정은 AWW 전용이 아니라 **모든 고객사에 적용되는 구조 개선**이다. 다음 고객사부터는 이 문제가 반복되지 않는다.

### 배운 것

**하드코딩은 환경이 바뀌는 순간 터진다.** MinIO의 `minio / minio123`은 온프레미스에서 문제 없이 1년 넘게 돌았다. 하지만 S3로 전환하는 순간 장애 요인이 됐다. "지금 동작하니까 괜찮다"는 생각으로 남겨둔 하드코딩은, 결국 가장 바쁜 배포 시점에 발목을 잡는다.

**온프레미스 → 클라우드는 레지스트리부터 다르다.** 같은 Nexus를 공유하는 온프레미스 고객사끼리는 `site` 값만 바꾸면 됐다. 클라우드 고객사는 레지스트리 호스트 자체가 다르고, 인증 방식도 다르다. 멀티 고객사 아키텍처를 설계할 때, "모든 고객사가 같은 레지스트리를 쓴다"는 전제를 두지 않는 게 맞다.

**선행 작업의 가치.** Nexus 인증(`imagePullSecrets`)을 온프레미스에서 먼저 해결해둔 덕분에 AWW EKS에서 이미지 pull 문제가 생기지 않았다. 인프라 기반 작업은 "지금 당장 필요하지 않더라도" 미리 해두면 나중에 시간을 절약해준다.
