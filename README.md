# MkDocs 명령어 모음

MkDocs는 마크다운 파일을 이용해 문서 웹사이트를 만들 수 있는 간편한 정적 사이트 생성기입니다. 아래는 MkDocs 사용 시 유용한 명령어 모음입니다.

## 기본 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `mkdocs new [dir-name]` | 새로운 MkDocs 프로젝트 생성 | `mkdocs new my-docs` |
| `mkdocs serve` | 개발 서버 실행 (기본 포트: 8000) | `mkdocs serve` |
| `mkdocs build` | 정적 사이트 생성 (site 디렉z토리에 빌드) | `mkdocs build` |
| `mkdocs gh-deploy` | GitHub Pages에 사이트 배포 | `mkdocs gh-deploy` |
| `mkdocs -h` | 도움말 표시 | `mkdocs -h` |

## 고급 옵션

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `mkdocs serve --dev-addr=0.0.0.0:8080` | 특정 호스트/포트로 개발 서버 실행 | `mkdocs serve --dev-addr=0.0.0.0:8080` |
| `mkdocs build --clean` | 빌드 전 output 디렉토리 정리 | `mkdocs build --clean` |
| `mkdocs build --site-dir=public` | 특정 디렉토리에 사이트 빌드 | `mkdocs build --site-dir=public` |
| `mkdocs build --verbose` | 상세한 빌드 정보 출력 | `mkdocs build --verbose` |
| `mkdocs build --no-directory-urls` | 디렉토리 URL 비활성화 | `mkdocs build --no-directory-urls` |

## 구성 관련 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `mkdocs build -f custom_config.yml` | 특정 구성 파일 사용 | `mkdocs build -f my_mkdocs.yml` |
| `mkdocs serve --dirtyreload` | 빠른 리로드 (변경된 페이지만 다시 빌드) | `mkdocs serve --dirtyreload` |
| `mkdocs build --strict` | 엄격 모드 (경고를 오류로 처리) | `mkdocs build --strict` |

## 플러그인 및 테마 관련

### 설치

```bash
# MkDocs-Material 테마 설치
pip install mkdocs-material

# 다양한 플러그인 설치 예시
pip install mkdocs-minify-plugin
pip install mkdocs-git-revision-date-localized-plugin
pip install mkdocs-awesome-pages-plugin
```

### mkdocs.yml 구성 예시

```yaml
site_name: 내 프로젝트 문서
theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
  language: ko
  features:
    - navigation.tabs
    - navigation.sections
    - toc.integrate

plugins:
  - search
  - minify:
      minify_html: true
  - git-revision-date-localized:
      type: date

markdown_extensions:
  - admonition
  - codehilite
  - toc:
      permalink: true
```

## 문제 해결 및 디버깅

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `pip show mkdocs` | 설치된 MkDocs 버전 확인 | `pip show mkdocs` |
| `pip list \| grep mkdocs` | 설치된 모든 MkDocs 관련 패키지 확인 | `pip list \| grep mkdocs` |
| `mkdocs build --verbose` | 상세한 로그와 함께 빌드 | `mkdocs build --verbose` |

## 자주 사용되는 workflow 예시

### 새 프로젝트 시작

```bash
# 새 프로젝트 생성
mkdocs new my-project-docs

# 디렉토리 이동
cd my-project-docs

# 기본 설정 편집
nano mkdocs.yml

# 로컬 서버 시작
mkdocs serve
```

### 문서 업데이트 및 배포

```bash
# 로컬에서 개발 서버 실행
mkdocs serve

# (문서 편집 후)
# GitHub Pages에 배포
mkdocs gh-deploy --force
```

### Docker를 이용한 MkDocs 실행

```bash
# MkDocs Material 이미지로 실행
docker run --rm -it -p 8000:8000 -v ${PWD}:/docs squidfunk/mkdocs-material
```

## Python과 함께 사용하기

MkDocs API를 파이썬 스크립트에서 사용할 수도 있습니다:

```python
from mkdocs.commands import build, serve
import mkdocs.config

# 설정 파일 로드
config_file = 'mkdocs.yml'
config = mkdocs.config.load_config(config_file)

# 빌드 실행
build.build(config)

# 또는 서버 시작
# serve.serve(config, dev_addr='localhost:8000', livereload=True)
```
