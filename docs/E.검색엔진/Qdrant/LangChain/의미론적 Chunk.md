대표적인 방법은 문장을 단위로 나눈 뒤, 각 문장의 임베딩(벡터)을 계산해 “의미적으로 유사한” 문장들을 하나의 청크로 묶는 방식입니다. 

아래 예시는 OpenAIEmbeddings를 이용해 간단한 semantic chunking 함수를 구현하고, 기존 고정 길이 청크 대신 적용하는 방법을 보여줍니다.

```python
import nltk
import numpy as np
from nltk.tokenize import sent_tokenize
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

nltk.download('punkt')  # 최초 1회만

# 1) 임베딩 객체 (기존 설정 그대로 재사용)
embedder = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key="YOUR_OPENAI_API_KEY",
)

def semantic_chunk(text: str,
                   embedder: OpenAIEmbeddings,
                   threshold: float = 0.75
                  ) -> list[str]:
    """
    1) 문장 단위로 분할
    2) 각 문장 임베딩 계산
    3) 순차적으로 유사도가 threshold 이상이면 같은 청크에 추가,
       아니면 새 청크로 분리
    """
    sents = sent_tokenize(text)
    embs = embedder.embed_documents(sents)  # 문장별 벡터 리스트

    chunks = []
    curr_sents, curr_embs = [], []
    for sent, emb in zip(sents, embs):
        if not curr_sents:
            curr_sents, curr_embs = [sent], [emb]
        else:
            avg_emb = np.mean(curr_embs, axis=0)
            sim = np.dot(emb, avg_emb) / (np.linalg.norm(emb) * np.linalg.norm(avg_emb))
            if sim >= threshold:
                curr_sents.append(sent)
                curr_embs.append(emb)
            else:
                chunks.append(" ".join(curr_sents))
                curr_sents, curr_embs = [sent], [emb]
    if curr_sents:
        chunks.append(" ".join(curr_sents))

    return chunks

# ──────────────────────────────────────────────────────────────
# 기존 청크 코드 대신 이 semantic_chunk를 적용

from langchain.document_loaders import TextLoader
from qdrant_client import QdrantClient
from qdrant_client.http.models import VectorParams, SparseVectorParams, Distance
from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse

# (1) 문서 로드
loader = TextLoader("example.pdf")  
docs = loader.load()  # Page 단위 Document 리스트

# (2) 의미 기반 청크 생성
semantic_docs = []
for doc in docs:
    chunks = semantic_chunk(doc.page_content, embedder, threshold=0.70)
    for chunk in chunks:
        semantic_docs.append(
            Document(page_content=chunk, metadata=doc.metadata)
        )

# (3) Qdrant에 색인
client = QdrantClient(url="http://localhost:6333")
store = QdrantVectorStore(
    client=client,
    collection_name="my_semantic_docs",
    embedding=embedder,
    sparse_embedding=FastEmbedSparse(model_name="Qdrant/bm25"),
    retrieval_mode=RetrievalMode.HYBRID,
    vector_name="dense",
    sparse_vector_name="sparse",
)
store.add_documents(documents=semantic_docs)
```

**요약**

1. **문장별 분할**: `nltk.sent_tokenize` 등을 이용해 문장 리스트로 분리
    
2. **문장 임베딩**: `embedder.embed_documents(sentences)` 호출
    
3. **유사도 기반 묶기**: 이전 청크의 평균 임베딩과 새 문장 벡터 간 cosine 유사도 비교해, threshold 이상이면 같은 청크에 포함
    
4. **Qdrant 색인**: 기존처럼 `QdrantVectorStore.add_documents`에 semantic 청크를 넘겨주면 끝
    

이렇게 하면 “고정 토큰 수”가 아니라 “의미적으로 일관된” 단위로 문서를 분할해서 색인할 수 있습니다.