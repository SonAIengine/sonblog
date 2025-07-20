## 한글 PDF 정확 추출을 위한 텍스트 + OCR 하이브리드 파서 구축기

한글로 작성된 PDF 문서를 정확하게 파싱하는 일은 생각보다 까다롭다. 특히 한국어 PDF는 일반적으로 텍스트 레이어가 존재하지 않거나, CID 인코딩으로 인해 텍스트가 파괴되어 있는 경우가 많다. 본 글에서는 텍스트 기반 PDF는 물론, 이미지 기반 PDF까지 모두 대응할 수 있는 파싱 파이프라인을 구축한 과정을 정리한다.


## 1. 문제 정의

PDF에서 텍스트를 추출하는 가장 일반적인 방법은 `pdfplumber`, `pdfminer.six` 등과 같은 라이브러리를 사용하는 것이다. 그러나 이 방식은 다음의 문제점을 가진다.

- 한글 텍스트가 (cid:XX) 형태로 깨지는 경우가 많다.
    
- 스캔 PDF처럼 이미지 기반으로 생성된 문서는 텍스트 추출이 불가능하다.
    
- 테이블 구조가 포함된 경우 셀 단위의 정제된 추출이 어렵다.
    

이러한 문제를 해결하기 위해 OCR 기반 접근법과 PDF 구조 인식 기법을 함께 적용한 복합 파서가 필요하다.


## 2. 접근 방식

파서의 기본 전략은 다음과 같다.

1. PDF가 **텍스트 기반인지 이미지 기반인지 자동 판별**한다.
    
2. 텍스트 PDF인 경우에는 `pdfplumber`를 사용하여 **빠르고 정밀하게 텍스트를 추출**한다.
    
3. 이미지 기반이거나 CID 패턴으로 손상된 텍스트만 포함된 경우에는 **OCR 기반으로 처리**한다.
    
4. OCR 처리 시에는 다양한 `--psm` 파라미터를 테스트하여 가장 정확한 결과를 선택한다.
    
5. 문서에 테이블이 포함되어 있다면 `layoutparser`를 이용해 테이블 박스를 탐지하고, 해당 영역만 별도로 OCR 처리한다.


## 3. 주요 라이브러리 및 환경 설정

```bash
pip install pdfplumber pytesseract pdf2image pillow
pip install layoutparser[ocr]  # 테이블 탐지를 포함하는 경우

brew install tesseract tesseract-lang poppler
```

Tesseract는 반드시 `kor.traineddata` 언어팩이 설치되어 있어야 하며, macOS에서는 아래와 같이 환경 변수를 설정해야 한다.

```bash
export TESSDATA_PREFIX=/opt/homebrew/share/
```

---

## 4. 핵심 코드 구조

### 4.1 텍스트 PDF 판별 함수

텍스트가 실질적으로 의미가 있는지 판별하는 로직을 포함한다.

```python
def is_valid_text(text: str) -> bool:
    has_real_text = re.search(r'[가-힣a-zA-Z0-9]', text)
    has_cid_only = all("(cid:" in token for token in text.split())
    return bool(has_real_text) and not has_cid_only

def is_text_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and is_valid_text(page_text):
                return True
    return False
```

---

### 4.2 텍스트 추출 함수

텍스트 PDF인 경우에는 빠르게 `pdfplumber`를 사용하여 텍스트를 추출한다.

```python
def extract_from_text_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"\n--- [Page {i+1}] ---\n{page_text}"
    return text.strip()
```

---

### 4.3 이미지 기반 PDF OCR 처리

OCR 처리 시에는 `pdf2image`를 이용해 페이지를 고해상도 이미지로 렌더링하고, `pytesseract`를 이용해 한글 인식을 수행한다.

```python
def extract_from_image_pdf(pdf_path):
    text = ""
    with TemporaryDirectory() as tempdir:
        images = convert_from_path(pdf_path, dpi=300, output_folder=tempdir, fmt="png")
        for i, image in enumerate(images):
            ocr_result = pytesseract.image_to_string(image, lang="kor", config="--psm 6")
            text += f"\n--- [Page {i+1}] ---\n{ocr_result.strip()}"
    return text.strip()
```

---

### 4.4 파서의 전체 흐름 제어

텍스트 판별과 OCR 처리를 자동으로 전환하는 파이프라인이다.

```python
def extract_korean_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"파일이 존재하지 않습니다: {pdf_path}")

    print(f"[INFO] 추출 시작: {pdf_path}")

    if is_text_pdf(pdf_path):
        print("[INFO] 텍스트 기반 PDF로 판별됨. pdfplumber 사용.")
        return extract_from_text_pdf(pdf_path)
    else:
        print("[INFO] 이미지 기반 PDF 또는 CID 깨짐 PDF. OCR(tesseract) 사용.")
        return extract_from_image_pdf(pdf_path)
```

---

## 5. 추가 고도화: PSM 자동 튜닝 및 테이블 OCR

OCR의 정확도를 높이기 위해 `--psm` 파라미터를 자동으로 튜닝할 수 있으며, 다음과 같은 전략을 쓸 수 있다.

```python
def ocr_with_best_psm(image):
    candidates = []
    for psm in ["6", "3", "11", "12"]:
        config = f"--psm {psm}"
        text = pytesseract.image_to_string(image, lang="kor", config=config)
        candidates.append((psm, text.strip()))

    def korean_ratio(s): return sum('가' <= c <= '힣' for c in s) / (len(s) + 1e-6)
    best = max(candidates, key=lambda x: korean_ratio(x[1]) * len(x[1]))
    return best[1]
```

또한 `layoutparser`를 사용하면 테이블 위치만 잘라서 OCR을 적용하는 방식도 가능하다.

```python
import layoutparser as lp

def detect_table_ocr(image):
    model = lp.Detectron2LayoutModel('lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config')
    layout = model.detect(image)
    tables = [b for b in layout if b.type == 'Table']
    result = ""
    for i, table in enumerate(tables):
        segment = table.pad(5).crop_image(image)
        ocr_text = pytesseract.image_to_string(segment, lang="kor", config="--psm 6")
        result += f"\n[Table {i+1}]\n{ocr_text.strip()}"
    return result
```

---

## 6. 결론

이 글에서 구현한 파서 구조는 다음의 장점을 가진다.

- PDF가 텍스트 기반이든 이미지 기반이든 자동으로 판단하여 최적의 추출 방식 적용
    
- `pdfplumber`를 이용한 빠른 텍스트 추출과, `tesseract` OCR의 보완적 사용
    
- CID 인코딩으로 인한 한글 깨짐 문제 자동 회피
    
- 다양한 `--psm` 설정을 통한 정확도 향상
    
- 테이블이 포함된 문서의 경우 테이블 구조 인식을 통해 OCR 범위 정밀화
    

단순히 `pdfplumber.extract_text()`만 사용하는 방식보다 훨씬 정교하고 다양한 한글 PDF 문서에 적용할 수 있는 범용 파서로 발전시킬 수 있다.

향후에는 페이지 내 요소 단위 청킹(chunking), vector embedding, 검색엔진 연계까지 통합하여 RAG(Retrieval-Augmented Generation) 파이프라인으로도 확장할 수 있다.