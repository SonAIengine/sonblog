## PDF 문서에서 구조화된 텍스트와 테이블 추출하기

PDF 문서는 다양한 레이아웃과 서식을 가지며, 그 안에서 유의미한 정보를 자동으로 추출하는 것은 쉽지 않다. 특히 한국어 문서의 경우 문단 구조, 표, 목록 등의 다양한 요소가 뒤섞여 있어 정제된 텍스트를 얻기 위해서는 복잡한 후처리 과정이 필요하다. 본 글에서는 `pdfminer.six` 라이브러리를 활용하여 PDF 문서로부터 **제목, 일반 문단, 표 형식의 데이터**를 구분하여 통합적으로 추출하고, 사람이 읽기 쉬운 형태로 가공하는 전체 파이프라인을 설명한다.

## 핵심 목표

- PDF 문서에서 텍스트, 제목, 목록, 표 등의 유형을 구분하여 추출
    
- Y 좌표 및 X 좌표 기반으로 텍스트를 정렬 및 그룹화
    
- 테이블 형태를 감지하여 행 단위로 구성
    
- 결과를 마크다운 형태에 가까운 구조로 출력
    
- 추가적으로 전체 텍스트 및 테이블을 별도로 백업


## 사용 라이브러리

- `pdfminer.six`: PDF 문서의 레이아웃 분석 및 텍스트 추출을 담당
    
- `re`: 정규표현식을 통한 텍스트 패턴 분석
    
- `pandas`: 테이블 구조 저장 시 사용 가능
    
- `os`, `sys`: 파일 입출력 및 경로 제어


## 주요 처리 단계

### 1. 텍스트 전처리 (`clean_text`)

텍스트를 추출한 이후에는 다음과 같은 정제를 수행한다:

- 연속된 공백과 개행 제거
    
- 선행/후행 공백 제거
    

```python
text = re.sub(r'\s+', ' ', text)
text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
text = text.strip()
```

### 2. 텍스트 유형 분류 (`classify_text_type`)

문단을 다음 4가지로 분류한다:

- 제목 (`title`)
    
- 일반 텍스트 (`text`)
    
- 목록 (`list`)
    
- 표 (`table`)
    

정규표현식을 통해 `제1조`, `1. 개요`, `가) 설명` 등의 패턴을 판별한다. 표에 대해서는 날짜, 시간, 숫자 등 반복되는 숫자 패턴 및 키워드 기반으로 감지한다.


### 3. 페이지별 텍스트 및 테이블 통합 추출 (`extract_unified_content`)

PDF 페이지마다 모든 `LTTextContainer`를 순회하며 텍스트를 추출하고, 다음과 같은 방식으로 처리한다:

- Y 좌표 기준 정렬 (위 → 아래)
    
- 같은 줄에 있는 텍스트들을 X 좌표 기준으로 정렬
    
- 여러 개의 요소가 한 줄에 존재하는 경우 `|` 기호로 묶어서 테이블 행으로 구성

```
이름 | 나이 | 직책
홍길동 | 34 | 매니저
```

### 4. 별도 테이블 구성 (`extract_tables_separately`)

추출된 텍스트 중에서 **정확히 테이블일 가능성이 높은 행**만을 별도로 추출한다. 다수의 열을 포함하면서 숫자 및 시간/근무 관련 키워드를 가진 행들만 필터링하며, 이를 `rows` 리스트로 구성한다.


### 5. 결과 포맷팅 (`format_content_for_output`)

다음과 같은 마크다운 유사 형식으로 구성된다:

- 제목: `## 제목`
    
- 테이블: `📊 텍스트1 | 텍스트2`
    
- 목록: `가) 항목`
    
- 일반 문단: 그대로 출력
    
- 페이지 헤더: `=== 페이지 N ===` 표시

### 6. 최종 결과 통합 및 저장 (`create_comprehensive_result`)

최종적으로 다음 섹션들을 포함하는 통합 분석 결과를 생성한다:

- 문서 내용 (텍스트 + 테이블 순서 통합)
    
- 구조화된 테이블 데이터 (행 기반 정리)
    
- 전체 텍스트 (백업용, 길이 제한 있음)
    

출력은 `result.txt` 파일로 저장되며, 결과는 CLI에 일부 미리보기 형태로 출력된다.


## 실행 예시

```bash
python pdf_analyzer.py
```

출력 예

```
📁 처리할 파일: data/23. 플래티어_행복소통협의회 운영규정.pdf
💾 출력 파일: result.txt
✅ 종합 결과가 저장되었습니다: result.txt
📊 총 내용 길이: 12,345 문자
📄 통합 내용 항목: 84 개
📋 구조화된 테이블: 5 개
```


## 활용 예시

- 사내 규정집, 회의록, 보고서 등 구조화된 문서를 분석하여 요약할 때 활용할 수 있다.
    
- 정형 텍스트와 반정형 테이블을 함께 다루는 업무에서 정리 도구로 활용이 가능하다.
    
- 추출된 테이블 데이터는 CSV, Excel 등으로 변환하여 추가 가공도 가능하다.
    


## 코드

```python
from pdfminer.high_level import extract_text, extract_pages
from pdfminer.layout import LAParams, LTTextContainer
import os
import re

def clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
    return text.strip()

def classify_text_type(text):
    if not text or len(text) < 2:
        return "ignore"
    title_patterns = [
        r'^[0-9]+\.\s*[가-힣]', r'^[가-힣]+\s*[0-9]*\.\s*[가-힣]',
        r'^[IVX]+\.\s*[가-힣]', r'^제\s*[0-9]+\s*[조항절]',
        r'^[가-힣]{2,}\s*[:：]', r'^[가-힣]{1,10}\s*관리\s*지침',
    ]
    for pattern in title_patterns:
        if re.match(pattern, text): return "title"
    table_patterns = [
        r'\d+시간|\d+분', r'\d+월|\d+일|\d+년',
        r'\d+:\d+|\d+시\s*\d+분', r'[가-힣]+\s*\|\s*[가-힣]+',
        r'[가-힣]+\s+\d+\s+[가-힣]+', r'^\s*\d+\s+[가-힣]+\s+\d+',
    ]
    for pattern in table_patterns:
        if re.search(pattern, text): return "table"
    list_patterns = [
        r'^[가-힣]\)\s*', r'^[0-9]+\)\s*', r'^-\s*[가-힣]', r'^•\s*[가-힣]'
    ]
    for pattern in list_patterns:
        if re.match(pattern, text): return "list"
    return "text"

def extract_unified_content(pdf_path):
    laparams = LAParams(
        boxes_flow=0.4, word_margin=0.1,
        char_margin=1.5, line_margin=0.4, detect_vertical=True
    )
    all_content = []
    for page_num, layout in enumerate(extract_pages(pdf_path, laparams=laparams)):
        elements = []
        for el in layout:
            if isinstance(el, LTTextContainer):
                text = clean_text(el.get_text())
                if text and len(text) > 1:
                    x0, y0, x1, y1 = el.bbox
                    text_type = classify_text_type(text)
                    if text_type != "ignore":
                        elements.append({'text': text, 'type': text_type, 'x0': x0, 'y0': y0})
        elements.sort(key=lambda x: -x['y0'])
        grouped = []
        i = 0
        while i < len(elements):
            group = [elements[i]]
            y = elements[i]['y0']
            j = i + 1
            while j < len(elements):
                if abs(elements[j]['y0'] - y) <= 5:
                    group.append(elements.pop(j))
                else:
                    j += 1
            group.sort(key=lambda x: x['x0'])
            if len(group) > 1:
                table_row = ' | '.join([g['text'] for g in group])
                grouped.append({'text': table_row, 'type': 'table'})
            else:
                grouped.append(group[0])
            i += 1
        all_content.append({'text': f"\n=== 페이지 {page_num + 1} ===", 'type': 'page_header'})
        all_content.extend(grouped)
    return all_content

def extract_tables_separately(pdf_path):
    laparams = LAParams(
        boxes_flow=0.3, word_margin=0.05,
        char_margin=1.0, line_margin=0.3, detect_vertical=True
    )
    tables = []
    for page_num, layout in enumerate(extract_pages(pdf_path, laparams=laparams)):
        rows, elements = [], []
        for el in layout:
            if isinstance(el, LTTextContainer):
                text = clean_text(el.get_text())
                if text and len(text) > 1:
                    x0, y0, x1, y1 = el.bbox
                    elements.append({'text': text, 'x0': x0, 'y0': y0})
        elements.sort(key=lambda x: -x['y0'])
        i = 0
        while i < len(elements):
            row = [elements[i]]
            y = elements[i]['y0']
            j = i + 1
            while j < len(elements):
                if abs(elements[j]['y0'] - y) <= 5:
                    row.append(elements.pop(j))
                else:
                    j += 1
            if len(row) > 1:
                row.sort(key=lambda x: x['x0'])
                texts = [r['text'] for r in row]
                if any(re.search(r'\d', t) for t in texts):
                    rows.append(texts)
            i += 1
        if rows:
            tables.append({'page': page_num + 1, 'rows': rows})
    return tables

def format_content(content):
    lines = []
    for item in content:
        t = item['text']
        tp = item['type']
        if tp == 'page_header': lines.append(f"\n{t}\n" + "-"*50)
        elif tp == 'title': lines.append(f"\n## {t}")
        elif tp == 'table': lines.append(t)
        elif tp == 'list': lines.append(f" - {t}")
        else: lines.append(t)
    return '\n'.join(lines)

def create_result(pdf_path, output_path="result.txt"):
    try:
        unified = extract_unified_content(pdf_path)
        tables = extract_tables_separately(pdf_path)
        basic_text = clean_text(extract_text(pdf_path))

        sections = [
            "="*80,
            "PDF 문서 분석 결과",
            "="*80
        ]

        if unified:
            sections.append("\n\n[통합 텍스트 및 테이블]")
            sections.append("-"*60)
            sections.append(format_content(unified))

        if tables:
            sections.append("\n\n[구조화된 테이블]")
            sections.append("-"*60)
            for t in tables:
                sections.append(f"\n- 페이지 {t['page']}")
                for i, row in enumerate(t['rows']):
                    if i == 0:
                        sections.append("헤더: " + " | ".join(row))
                        sections.append("-"*40)
                    else:
                        sections.append(" | ".join(row))

        if basic_text and len(basic_text) > 100:
            sections.append("\n\n[전체 텍스트 (참고용)]")
            sections.append("-"*60)
            sections.append(basic_text[:3000] + "\n...(이하 생략)" if len(basic_text) > 3000 else basic_text)

        result = '\n'.join(sections)
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result)

    except Exception as e:
        print(f"[오류] 결과 생성 실패: {e}")

if __name__ == "__main__":
    create_result("data/23. 플래티어_행복소통협의회 운영규정.pdf", "result.txt")
```

---

### 주요 변경 요약

|항목|설명|
|---|---|
|로그 제거|`print` 문 대부분 제거, 필요한 경우 `Exception` 시 메시지만 출력|
|미리보기 제거|1500자 출력 등 모든 프리뷰 제거|
|불필요한 출력 제거|`🎉`, `📁`, `📋` 등 이모티콘 출력 삭제|
|출력 구조 간결화|출력 포맷을 최소한의 마크다운 형태로 유지|
|실행 구조 단순화|`main()` → `create_result()` 호출만 수행|

이제 이 코드는 **조용히 PDF를 분석하고, 바로 `result.txt`에 결과만 저장**하는 형태로 사용할 수 있다. 배치 처리나 서버 측 자동화에도 적합하다.