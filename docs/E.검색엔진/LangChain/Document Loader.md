LangChain에서 한글 인코딩을 잘 처리하는 Document Loader는 다양한 파일 형식의 데이터를 로드하여 분석할 수 있도록 지원한다. 

이 로더는 파일을 로드하고, 이를 Document 객체로 변환하여 사용할 수 있도록 한다. 

여기서는 한글이 포함된 문서들을 처리하는 데 유용한 방법을 소개한다.

### 1. **LangChain Document Loader의 개념**

LangChain의 문서 로더는 PDF, Word, Excel, CSV, JSON 등 여러 형식의 파일을 로드하여 이를 `Document` 객체로 변환한다. 각 파일 형식에 맞는 로더가 존재하며, 파일을 로드한 후에는 문서의 내용을 `page_content`에, 메타데이터는 `metadata`에 저장된다. 이를 통해 문서에서 필요한 정보를 쉽게 추출할 수 있다.

### 2. **Document 객체의 구조**

`Document` 객체는 두 가지 주요 속성을 가진다:

- `page_content`: 문서의 실제 내용을 포함하는 문자열.
    
- `metadata`: 문서와 관련된 메타데이터를 저장하는 딕셔너리.
    

#### 예시 코드

```python
from langchain_core.documents import Document

# Document 객체 생성
document = Document("안녕하세요? 이건 랭체인의 도큐먼트 입니다")

# 도큐먼트의 속성 확인
print(document.__dict__)
# 출력: {'id': None, 'metadata': {}, 'page_content': '안녕하세요? 이건 랭체인의 도큐먼트 입니다', 'type': 'Document'}

# 메타데이터 추가
document.metadata["source"] = "TeddyNote"
document.metadata["page"] = 1
document.metadata["author"] = "Teddy"

# 도큐먼트의 메타데이터 확인
print(document.metadata)
# 출력: {'source': 'TeddyNote', 'page': 1, 'author': 'Teddy'}
```

### 3. **한글 인코딩을 잘 처리하는 문서 로더**

한글이 포함된 파일을 로드할 때, 인코딩 문제를 피하기 위해 `TextLoader`, `CSVLoader`, `UnstructuredExcelLoader` 등 다양한 로더를 사용할 수 있다. 이들 로더는 한글 인코딩을 자동으로 감지하거나, 필요한 경우 파일 인코딩을 지정할 수 있다.

#### 예시: `TextLoader`를 이용한 텍스트 파일 로딩

```python
from langchain_community.document_loaders import TextLoader

# 텍스트 로더 생성
loader = TextLoader("data/appendix-keywords.txt")

# 문서 로드
docs = loader.load()

print(f"문서의 수: {len(docs)}\n")  # 출력: 문서의 수: 1

print("[메타데이터]\n")
print(docs[0].metadata)

print("\n========= [앞부분] 미리보기 =========\n")
print(docs[0].page_content[:500])
```

이 코드에서는 텍스트 파일을 로드하고, 로드한 문서의 앞부분을 미리보기 형식으로 출력한다. 한글이 포함된 텍스트도 문제없이 처리된다.

### 4. **다양한 파일 형식의 로드**

- **CSV 파일**: CSVLoader를 사용하여 쉼표로 구분된 데이터를 문서 객체로 로드한다. 한글이 포함된 데이터도 제대로 처리된다.
    
- **Excel 파일**: `UnstructuredExcelLoader`를 사용하여 `.xlsx` 파일을 로드한다. 이 로더는 Excel 파일에서 각 행을 하나의 문서로 처리하며, 한글 인코딩도 자동으로 처리한다.
    

#### 예시: CSV 로더 사용

```python
from langchain_community.document_loaders.csv_loader import CSVLoader

# CSV 로더 생성
loader = CSVLoader(file_path="./data/titanic.csv")

# 데이터 로드
docs = loader.load()

print(len(docs))  # 출력: 891
print(docs[0].metadata)  # 출력: {'source': './data/titanic.csv', 'row': 0}
```

### 5. **파일 인코딩 자동 감지**

LangChain의 `TextLoader` 클래스는 파일 인코딩을 자동으로 감지하여 로드할 수 있다. 이를 통해 다양한 인코딩의 파일을 문제없이 처리할 수 있다.

#### 예시: 인코딩 자동 감지

```python
from langchain_community.document_loaders import DirectoryLoader

path = "data/"

text_loader_kwargs = {"autodetect_encoding": True}

loader = DirectoryLoader(
    path,
    glob="**/*.txt",
    loader_cls=TextLoader,
    silent_errors=True,
    loader_kwargs=text_loader_kwargs,
)

docs = loader.load()

# 로드된 파일들의 목록 확인
doc_sources = [doc.metadata["source"] for doc in docs]
print(doc_sources)
```

### 6. **문서 로드 후 처리**

로드된 문서는 메타데이터와 함께 다양한 형식으로 출력할 수 있다. 예를 들어, CSV 파일에서 각 행을 로드할 때 해당 행의 정보를 `metadata`로 저장하고, 내용을 `page_content`로 표시할 수 있다.

### 7. **한글 지원 로더 활용**

LangChain에서 한글이 포함된 문서를 로드할 때 발생할 수 있는 인코딩 문제를 자동으로 처리하기 위해 다양한 로더를 활용할 수 있다. 예를 들어, `TextLoader`는 텍스트 파일에서 한글을 문제없이 로드할 수 있으며, `CSVLoader`와 `UnstructuredExcelLoader`는 한글이 포함된 CSV나 Excel 파일을 로드할 때 유용하다.


아래는 각 파일 형식(PDF, Word, Excel, CSV, JSON)에 대해 LangChain 문서 로더를 사용하는 예시 코드입니다. 각 형식에 맞는 로더를 사용하여 문서를 로드하고, 이를 `Document` 객체로 변환합니다.

### 1. **PDF 파일 로딩 (PyPDFLoader)**

```python
from langchain_community.document_loaders import PyPDFLoader

# PDF 파일 경로 설정
FILE_PATH = "./data/sample.pdf"

# PyPDFLoader 인스턴스 생성
loader = PyPDFLoader(FILE_PATH)

# 문서 로드
docs = loader.load()

# 문서 내용 출력
print(f"문서의 수: {len(docs)}")
print(docs[0].page_content[:300])  # 첫 번째 문서 내용 미리보기
```

### 2. **Word 파일 로딩 (UnstructuredWordDocumentLoader)**

```python
from langchain_community.document_loaders import UnstructuredWordDocumentLoader

# Word 파일 경로 설정
FILE_PATH = "./data/sample-word-document.docx"

# UnstructuredWordDocumentLoader 인스턴스 생성
loader = UnstructuredWordDocumentLoader(FILE_PATH)

# 문서 로드
docs = loader.load()

# 문서 내용 출력
print(f"문서의 수: {len(docs)}")
print(docs[0].page_content[:300])  # 첫 번째 문서 내용 미리보기
```

### 3. **Excel 파일 로딩 (UnstructuredExcelLoader)**

```python
from langchain_community.document_loaders import UnstructuredExcelLoader

# Excel 파일 경로 설정
FILE_PATH = "./data/sample.xlsx"

# UnstructuredExcelLoader 인스턴스 생성
loader = UnstructuredExcelLoader(FILE_PATH, mode="elements")

# 문서 로드
docs = loader.load()

# 문서 내용 출력
print(f"문서의 수: {len(docs)}")
print(docs[0].page_content[:300])  # 첫 번째 문서 내용 미리보기
```

### 4. **CSV 파일 로딩 (CSVLoader)**

```python
from langchain_community.document_loaders.csv_loader import CSVLoader

# CSV 파일 경로 설정
FILE_PATH = "./data/sample.csv"

# CSVLoader 인스턴스 생성
loader = CSVLoader(file_path=FILE_PATH)

# 문서 로드
docs = loader.load()

# 문서 내용 출력
print(f"문서의 수: {len(docs)}")
print(docs[0].page_content[:300])  # 첫 번째 문서 내용 미리보기
```

### 5. **JSON 파일 로딩 (JSONLoader)**

```python
from langchain_community.document_loaders import JSONLoader

# JSON 파일 경로 설정
FILE_PATH = "./data/sample.json"

# JSONLoader 인스턴스 생성
loader = JSONLoader(file_path=FILE_PATH, jq_schema=".[].phoneNumbers", text_content=False)

# 문서 로드
docs = loader.load()

# 문서 내용 출력
print(f"문서의 수: {len(docs)}")
print(docs[0].page_content)  # 첫 번째 문서 내용 미리보기
```

### 설명

- **PyPDFLoader**: PDF 파일을 로드하여 문서 객체로 반환합니다. 텍스트가 포함된 PDF 파일을 처리합니다.
    
- **UnstructuredWordDocumentLoader**: Word 문서(`.docx`)를 로드하여 `Document` 객체로 반환합니다. 비구조화된 텍스트 덩어리를 처리합니다.
    
- **UnstructuredExcelLoader**: Excel 파일(`.xlsx`)을 로드하여 Excel 데이터를 텍스트로 변환합니다. HTML 형식으로 처리할 수 있는 옵션도 제공됩니다.
    
- **CSVLoader**: CSV 파일을 로드하여 각 행을 하나의 문서로 변환합니다. 필요시 커스터마이징하여 로드할 수 있습니다.
    
- **JSONLoader**: JSON 파일을 로드하여 원하는 JSON 경로(`jq_schema`)의 값을 텍스트로 반환합니다.



### 통합 Document Loader 함수
~~~python
from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredExcelLoader,
    CSVLoader,
    JSONLoader,
    TextLoader
)

def load_document(file_path: str):
    """
    주어진 파일 경로에 따라 적절한 Document 로더를 선택하여 문서를 로드합니다.
    
    Parameters:
        file_path (str): 로드할 파일의 경로
        
    Returns:
        list: 로드된 Document 객체들의 리스트
    """
    
    # 파일 확장자 추출
    file_extension = file_path.split('.')[-1].lower()

    # 확장자에 따른 로더 선택
    if file_extension == 'pdf':
        # PDF 파일 로드
        loader = PyPDFLoader(file_path)
        return loader.load()
    
    elif file_extension == 'docx':
        # Word 파일 로드
        loader = UnstructuredWordDocumentLoader(file_path)
        return loader.load()
    
    elif file_extension == 'xlsx' or file_extension == 'xls':
        # Excel 파일 로드
        loader = UnstructuredExcelLoader(file_path, mode="elements")
        return loader.load()
    
    elif file_extension == 'csv':
        # CSV 파일 로드
        loader = CSVLoader(file_path=file_path)
        return loader.load()
    
    elif file_extension == 'json':
        # JSON 파일 로드
        loader = JSONLoader(file_path=file_path, jq_schema=".[].phoneNumbers", text_content=False)
        return loader.load()
    
    elif file_extension == 'txt':
        # 텍스트 파일 로드
        loader = TextLoader(file_path)
        return loader.load()
    
    else:
        raise ValueError(f"지원되지 않는 파일 형식입니다: {file_extension}")

# 예시: PDF, Word, Excel, CSV, JSON, 텍스트 파일 로드
file_paths = [
    "./data/sample.pdf", 
    "./data/sample-word-document.docx",
    "./data/sample.xlsx",
    "./data/sample.csv",
    "./data/sample.json",
    "./data/sample.txt"
]

# 각 파일을 로드하고 결과 출력
for file_path in file_paths:
    docs = load_document(file_path)
    print(f"파일: {file_path} -> 문서 수: {len(docs)}")
    print(f"첫 번째 문서 내용: {docs[0].page_content[:300]}")
    print(f"첫 번째 문서 메타데이터: {docs[0].metadata}\n")
~~~