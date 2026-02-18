---
title: "LangChain과 Qdrant"
description: "Qdrant는 고성능의 벡터 유사도 검색 엔진으로, REST 및 gRPC API를 통해 벡터 저장, 검색, 필터링을 제공한다. LangChain은 대형 언어 모델(LLM)의 응용을 위한 프레임워크로, 다양한 벡터 저장소(Vector Store)와의 통합을 지원한다."
date: 2025-07-16
tags:
  - LangChain
  - 검색엔진
  - 벡터 검색
  - Qdrant
---

## 1. 개요

Qdrant는 고성능의 벡터 유사도 검색 엔진으로, REST 및 gRPC API를 통해 벡터 저장, 검색, 필터링을 제공한다. LangChain은 대형 언어 모델(LLM)의 응용을 위한 프레임워크로, 다양한 벡터 저장소(Vector Store)와의 통합을 지원한다. 

이 문서에서는 `langchain-qdrant` 모듈을 사용하여 Qdrant를 LangChain과 연동하고, Dense Vector Search, Sparse Vector Search, Hybrid Search, 메타데이터 필터링, Retriever 변환 등의 기능을 모두 활용하는 예제를 소개한다.

## 2. 실험 환경 및 라이브러리 설치

다음 환경에서 실험을 진행한다.

- Python 3.12+
    
- Qdrant 서버: 로컬 Docker 환경에서 실행
    
- LangChain 모듈: `langchain-openai`, `langchain-qdrant`, `fastembed` 사용
    

필수 패키지 설치는 다음과 같다.

```bash
pip install -U langchain-openai langchain-qdrant qdrant-client fastembed
```

## 3. Qdrant 서버 준비

Qdrant는 Docker로 쉽게 실행할 수 있다. 로컬에서 실행 시 다음 명령어를 사용한다.

```bash
docker run -d \
  -p 6333:6333 \
  -v $(pwd)/qdrant_data:/qdrant/storage \
  --name qdrant \
  qdrant/qdrant
```

## 4. LangChain + Qdrant 연동 전체 코드

아래 코드는 모든 주요 기능을 포함한 통합 예제이다. 이 코드를 기반으로 다양한 검색 실험이 가능하다.

### 4.1 전체 코드

```python
import os
from uuid import uuid4
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, SparseVectorParams
from langchain_core.documents import Document

# 1) 임베딩
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key=os.environ["OPENAI_API_KEY"],
)
sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")

# 2) Qdrant 연결
client = QdrantClient(url="http://localhost:6333")

# 3) 컬렉션( dense + sparse ) 생성
if client.collection_exists("my_documents"):
    client.delete_collection("my_documents")

client.create_collection(
    collection_name="my_documents",
    vectors_config={"dense": VectorParams(size=1536, distance=Distance.COSINE)},
    sparse_vectors_config={"sparse": SparseVectorParams(index=models.SparseIndexParams(on_disk=False))},
)

# 4) 문서 준비
raw_texts = [
    ("I had chocolate chip pancakes and scrambled eggs for breakfast this morning.", "tweet"),
    ("The weather forecast for tomorrow is cloudy and overcast, with a high of 62 degrees Fahrenheit.", "news"),
    ("Building an exciting new project with LangChain - come check it out!", "tweet"),
    ("Robbers broke into the city bank and stole $1 million in cash.", "news"),
    ("Wow! That was an amazing movie. I can't wait to see it again.", "tweet"),
    ("Is the new iPhone worth the price? Read this review to find out.", "website"),
    ("The top 10 soccer players in the world right now.", "website"),
    ("LangGraph is the best framework for building stateful, agentic applications!", "tweet"),
    ("The stock market is down 500 points today due to fears of a recession.", "news"),
    ("I have a bad feeling I am going to get deleted :(", "tweet"),
]
documents = [Document(page_content=t, metadata={"source": s}) for t, s in raw_texts]
uuids = [str(uuid4()) for _ in documents]

# 5) Hybrid 저장
hybrid_store = QdrantVectorStore(
    client=client,
    collection_name="my_documents",
    embedding=embeddings,
    sparse_embedding=sparse_embeddings,
    retrieval_mode=RetrievalMode.HYBRID,
    vector_name="dense",
    sparse_vector_name="sparse",
)
hybrid_store.add_documents(documents=documents, ids=uuids)

# 6) Dense / Sparse / Hybrid 검색 및 출력
dense_store = QdrantVectorStore(client, "my_documents", embedding=embeddings,
                                retrieval_mode=RetrievalMode.DENSE, vector_name="dense")
sparse_store = QdrantVectorStore(client, "my_documents", sparse_embedding=sparse_embeddings,
                                 retrieval_mode=RetrievalMode.SPARSE, sparse_vector_name="sparse")

print("🔍 Dense 검색:", [d.page_content for d in dense_store.similarity_search("LangChain project", k=2)])
print("🔍 Sparse 검색:", [d.page_content for d in sparse_store.similarity_search("soccer players", k=1)])
print("🔍 Hybrid 검색:",
      [(d.page_content, f"{s:.6f}") for d, s in hybrid_store.similarity_search_with_score("Will it be hot tomorrow", k=1)])

# 7) Metadata 필터링 검색
flt = models.Filter(should=[models.FieldCondition(
    key="page_content",
    match=models.MatchValue(value="The top 10 soccer players in the world right now.")
)])
print("🔍 Metadata 필터:", [d.page_content for d in hybrid_store.similarity_search("best soccer players", k=1, filter=flt)])

# 8) 문서 삭제
hybrid_store.delete(ids=[uuids[-1]])

# 9) Retriever 변환
retriever = hybrid_store.as_retriever(search_type="mmr", search_kwargs={"k": 1})
print("🔍 Retriever 결과:", [d.page_content for d in retriever.invoke("Stealing from the bank is a crime")])

# 10) Named vector + 커스텀 키
QdrantVectorStore.from_documents(
    documents[:2],
    embeddings,
    sparse_embedding=sparse_embeddings,
    location=":memory:",
    collection_name="my_documents_custom",
    content_payload_key="my_page_content",
    metadata_payload_key="my_meta",
    vector_name="custom_vector",
    sparse_vector_name="custom_sparse_vector",
    retrieval_mode=RetrievalMode.HYBRID,
)
print("✅ 커스텀 필드 인덱싱 완료")
```

코드에서 수행되는 주요 기능들은 다음과 같다.

## 5. 주요 기능별 설명

### 5.1 Dense Vector Search

Dense 검색은 임베딩된 벡터 간의 코사인 유사도를 계산하여 가장 유사한 문서를 반환한다. LangChain에서는 `OpenAIEmbeddings`를 활용하여 dense 벡터를 생성하고, Qdrant에 저장된 dense 벡터와 비교하여 유사도 검색을 수행한다.

```python
dense_store.similarity_search("LangChain project", k=2)
```

검색 결과는 LLM 관련 문장들이 우선적으로 반환되며, 의미적 유사성을 기반으로 정확한 결과를 제공한다.

---

### 5.2 Sparse Vector Search (BM25)

희소 벡터 검색은 키워드 기반의 텍스트 검색으로, BM25 알고리즘에 기반한다. `FastEmbedSparse`를 통해 sparse vector를 생성하며, Qdrant는 이를 별도 인덱스로 관리한다.

```python
sparse_store.similarity_search("soccer players", k=1)
```

이 방식은 전통적인 정보 검색(IR)과 유사하며, 명시적인 키워드를 포함하는 문서 검색에 유리하다.


### 5.3 Hybrid Search

Hybrid 검색은 Dense와 Sparse 검색을 동시에 수행하고, 유사도 점수를 통합하여 결과를 정렬한다. 의미 기반과 키워드 기반 검색의 장점을 결합한다.

```python
results = hybrid_vector_store.similarity_search_with_score(
    "Will it be hot tomorrow", k=1
)
```

`RetrievalMode.HYBRID`로 설정 시 두 종류의 벡터가 모두 저장되고 검색 시 활용된다.


### 5.4 메타데이터 필터링

Qdrant는 JSON 기반의 Payload에 대해 필터링 기능을 제공하며, LangChain에서도 이를 그대로 사용할 수 있다. 특정 키 또는 값 기준으로 검색 결과를 제한할 수 있다.

```python
filter=models.Filter(
    should=[
        models.FieldCondition(
            key="page_content",
            match=models.MatchValue(value="The top 10 soccer players in the world right now.")
        )
    ]
)
```

이는 Faceted Search 또는 조건 기반 필터링이 필요한 RAG 파이프라인에서 매우 유용하다.


### 5.5 문서 삭제

추가된 문서는 UUID를 기반으로 제거할 수 있다. 해당 기능은 문서 갱신 또는 RAG 문맥 관리 시 유용하게 활용된다.

```python
hybrid_vector_store.delete(ids=[target_id])
```


### 5.6 Retriever 변환

`QdrantVectorStore`는 `.as_retriever()` 메서드를 통해 LangChain의 `Retriever`로 변환할 수 있다. 변환된 Retriever는 LLM 체인 또는 Agent 내부에서 직접 사용 가능하다.

```python
retriever = hybrid_vector_store.as_retriever(search_type="mmr", search_kwargs={"k": 1})
docs = retriever.invoke("Stealing from the bank is a crime")
```

MMR(Maximal Marginal Relevance)을 활용하면 다양한 관점의 문서를 혼합해 반환할 수 있다.


### 5.7 Named Vector 및 커스텀 Payload 키 활용

Qdrant는 동일한 문서에 여러 named vector를 저장할 수 있다. 또한 `page_content`, `metadata` 외에 커스텀 키로도 저장할 수 있다.

```python
QdrantVectorStore.from_documents(
    docs,
    embeddings,
    sparse_embedding=sparse_embeddings,
    location=":memory:",
    collection_name="my_documents_custom",
    content_payload_key="my_page_content",
    metadata_payload_key="my_meta",
    vector_name="custom_vector",
    sparse_vector_name="custom_sparse_vector",
    retrieval_mode=RetrievalMode.HYBRID,
)
```

이는 외부에서 생성된 Qdrant 컬렉션을 LangChain에 그대로 연결할 때 매우 유용하다.


## 6. 결론

Qdrant는 LangChain과의 통합을 통해 다양한 검색 시나리오를 유연하게 지원하며, Dense, Sparse, Hybrid 검색 모드를 기반으로 하는 강력한 RAG 시스템 구축이 가능하다. 메타데이터 기반 필터링, 다중 벡터 저장, 문서 삭제 및 Retriever 변환까지 포함한 전체 기능을 손쉽게 활용할 수 있다.

Qdrant + LangChain은 단순한 벡터 DB 그 이상으로, LLM 애플리케이션을 위한 실질적인 검색/리트리벌 인프라로 사용될 수 있다.