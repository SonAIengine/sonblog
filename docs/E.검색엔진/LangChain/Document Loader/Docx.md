```python
from pdfminer.high_level import extract_text

from langchain_community.document_loaders import Docx2txtLoader

  

import os

import subprocess

from pathlib import Path

from langchain_community.document_loaders import Docx2txtLoader

  

# 원본 .doc 파일 경로

doc_path = Path("data/3. 휴가규정_(주)플래티어_250312.doc")

docx_path = doc_path.with_suffix(".docx") # .docx 경로로 변경

  

# 1️⃣ .doc → .docx 변환 (libreoffice 사용)

if not docx_path.exists():

print(f"[INFO] .docx 파일이 없으므로 변환 중: {doc_path.name}")

result = subprocess.run([

"libreoffice", "--headless", "--convert-to", "docx", str(doc_path),

"--outdir", str(doc_path.parent)

], capture_output=True)

  

if result.returncode != 0:

print("[ERROR] 변환 실패:\n", result.stderr.decode())

exit(1)

else:

print(f"[SUCCESS] 변환 완료: {docx_path.name}")

  

# 2️⃣ LangChain 로더로 불러오기

loader = Docx2txtLoader(str(docx_path))

docs = loader.load()

  

# 3️⃣ 내용 출력

print("\n📄 문서 미리보기:\n")

print(docs[0].page_content)
```