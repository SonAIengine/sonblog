---
tags:
  - RAG
  - Kotaemon
  - 리팩토링
  - LLM
---

# OJT 리팩토링과 Kotaemon RAG 구현기

> 2025년 1월, 기존 OJT 시스템의 한계를 해결하고자 전면 리팩토링을 진행했다. 특히 Kotaemon RAG 프레임워크를 도입하여 문서 기반 질의응답 성능을 대폭 개선한 과정을 공유한다.

## 기존 시스템의 한계

### OJT 플랫폼 문제점
기존 OJT(On-the-Job Training) 시스템은 단순한 문서 저장소에 불과했다:

- **검색 정확도 부족**: 키워드 기반 검색으로 맥락 이해 불가
- **문서 파편화**: PDF, Word, PowerPoint 등 다양한 형식 지원 미흡  
- **학습 추적 한계**: 개별 학습자의 진도와 이해도 파악 어려움
- **확장성 문제**: 문서 추가 시마다 수동 인덱싱 필요

특히 신입 개발자들이 "이 기술을 어떻게 사용하는지" 같은 맥락적 질문에 대해 적절한 답변을 얻기 어려웠다.

### RAG 시스템 한계
기존에 구축한 RAG도 문제가 있었다:

```python
# 기존 RAG 구조의 문제점
class SimpleRAG:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vectordb = FAISS.from_documents(docs, self.embeddings)
        
    def query(self, question: str):
        # 1. 단순 유사도 검색만 사용
        docs = self.vectordb.similarity_search(question, k=5)
        
        # 2. 컨텍스트 길이 제한 없이 모든 문서 연결
        context = "\n".join([doc.page_content for doc in docs])
        
        # 3. 단순 프롬프트
        prompt = f"Context: {context}\n\nQuestion: {question}\nAnswer:"
        return llm.generate(prompt)
```

문제점들:
- **청킹 전략 부재**: 문서를 무작정 1000자씩 나누기만 함
- **메타데이터 미활용**: 문서 타입, 작성일, 난이도 등 정보 무시
- **재랭킹 없음**: 단순 벡터 유사도만으로 문서 선택
- **멀티턴 지원 부족**: 이전 대화 맥락 고려 안됨

## Kotaemon RAG 프레임워크 도입

### Kotaemon 선택 이유

여러 RAG 프레임워크를 검토한 결과 Kotaemon을 선택했다:

| 프레임워크 | 장점 | 단점 |
|-----------|------|------|
| LangChain | 생태계 풍부 | 복잡도 높음, 버전 호환성 문제 |
| LlamaIndex | 인덱싱 최적화 | 커스터마이징 어려움 |
| **Kotaemon** | **모듈러 설계, 쉬운 확장** | **상대적으로 작은 커뮤니티** |
| Haystack | 검색 엔진 통합 | 학습 곡선 가파름 |

Kotaemon의 핵심 강점:

1. **플러그인 아키텍처**: 각 구성요소를 독립적으로 교체 가능
2. **멀티모달 지원**: 텍스트, 이미지, 표 등 다양한 형식 처리
3. **실시간 평가**: 답변 품질을 즉시 측정 가능
4. **쉬운 배포**: Docker 컨테이너로 바로 운영 환경 배포

### 새로운 아키텍처 설계

```python
# kotaemon 기반 새로운 RAG 아키�ecture
from kotaemon.base import Document, BaseComponent
from kotaemon.retrievers import HybridRetriever
from kotaemon.generators import ReActAgent
from kotaemon.evaluation import RAGEvaluator

class AdvancedOJTRAG:
    def __init__(self):
        # 1. 멀티 레벨 임베딩 전략
        self.dense_retriever = DenseRetriever(
            model_name="intfloat/multilingual-e5-large"
        )
        self.sparse_retriever = BM25Retriever()
        
        # 2. 하이브리드 검색
        self.hybrid_retriever = HybridRetriever(
            retrievers=[self.dense_retriever, self.sparse_retriever],
            weights=[0.7, 0.3]
        )
        
        # 3. 재랭킹 모델
        self.reranker = CrossEncoderReranker(
            model_name="cross-encoder/ms-marco-MiniLM-L-12-v2"
        )
        
        # 4. 멀티턴 대화 관리
        self.conversation_manager = ConversationManager()
        
        # 5. 실시간 평가
        self.evaluator = RAGEvaluator(
            metrics=["faithfulness", "answer_relevancy", "context_precision"]
        )

    async def process_query(
        self, 
        query: str, 
        conversation_id: str = None,
        user_level: str = "beginner"
    ):
        # 1. 대화 컨텍스트 가져오기
        conversation_context = await self.conversation_manager.get_context(
            conversation_id
        )
        
        # 2. 쿼리 확장 및 재작성
        enhanced_query = await self._enhance_query(
            query, conversation_context, user_level
        )
        
        # 3. 하이브리드 검색
        candidate_docs = await self.hybrid_retriever.retrieve(
            enhanced_query, top_k=20
        )
        
        # 4. 재랭킹
        relevant_docs = await self.reranker.rerank(
            enhanced_query, candidate_docs, top_k=5
        )
        
        # 5. 답변 생성
        answer = await self._generate_answer(
            enhanced_query, relevant_docs, user_level
        )
        
        # 6. 실시간 평가
        evaluation = await self.evaluator.evaluate(
            query, relevant_docs, answer
        )
        
        # 7. 대화 저장
        await self.conversation_manager.save_turn(
            conversation_id, query, answer, evaluation
        )
        
        return {
            "answer": answer,
            "sources": relevant_docs,
            "confidence": evaluation["faithfulness"],
            "suggestions": await self._get_suggestions(query, user_level)
        }
```

### 고급 청킹 전략

기존의 단순 고정 길이 청킹을 대체하여 의미 기반 청킹을 구현했다:

```python
from kotaemon.parsers import SemanticChunker
from transformers import pipeline

class SmartDocumentProcessor:
    def __init__(self):
        self.semantic_chunker = SemanticChunker(
            chunk_size=512,
            chunk_overlap=50,
            separator_type="semantic"
        )
        
        # 문서 타입별 전용 파서
        self.parsers = {
            'pdf': PDFParser(),
            'docx': DocxParser(), 
            'pptx': PowerPointParser(),
            'py': CodeParser(),
            'md': MarkdownParser()
        }
        
        # 난이도 분석기
        self.difficulty_classifier = pipeline(
            "text-classification",
            model="textbook-difficulty-classifier"
        )
    
    async def process_document(self, file_path: str, metadata: dict = {}):
        """문서를 의미 단위로 청킹하고 메타데이터 추가"""
        
        # 1. 파일 타입별 파싱
        file_extension = file_path.split('.')[-1].lower()
        parser = self.parsers.get(file_extension, self.parsers['pdf'])
        
        content = await parser.parse(file_path)
        
        # 2. 의미 기반 청킹
        chunks = await self.semantic_chunker.chunk(content)
        
        # 3. 각 청크에 메타데이터 추가
        enriched_chunks = []
        for chunk in chunks:
            # 난이도 분석
            difficulty = self.difficulty_classifier(chunk.content)[0]
            
            # 키워드 추출
            keywords = await self._extract_keywords(chunk.content)
            
            # 코드 블록 감지
            has_code = self._detect_code_blocks(chunk.content)
            
            enriched_chunk = Document(
                content=chunk.content,
                metadata={
                    **metadata,
                    'difficulty_level': difficulty['label'],
                    'difficulty_score': difficulty['score'],
                    'keywords': keywords,
                    'has_code': has_code,
                    'chunk_index': chunk.index,
                    'source_file': file_path,
                    'created_at': datetime.now().isoformat()
                }
            )
            enriched_chunks.append(enriched_chunk)
            
        return enriched_chunks
    
    async def _extract_keywords(self, text: str) -> list:
        """TF-IDF 기반 키워드 추출"""
        from sklearn.feature_extraction.text import TfidfVectorizer
        import jieba  # 한국어 토크나이징
        
        # 형태소 분석
        tokens = jieba.cut(text)
        processed_text = ' '.join(tokens)
        
        # TF-IDF
        vectorizer = TfidfVectorizer(
            max_features=10,
            stop_words='english',  # 영어 불용어
            ngram_range=(1, 2)
        )
        
        tfidf_matrix = vectorizer.fit_transform([processed_text])
        feature_names = vectorizer.get_feature_names_out()
        
        # 상위 키워드 반환
        scores = tfidf_matrix.toarray()[0]
        keywords = [
            feature_names[i] 
            for i in scores.argsort()[-5:][::-1]
            if scores[i] > 0
        ]
        
        return keywords
```

### 개인화된 학습 경로

사용자 레벨에 따른 맞춤형 답변을 제공하도록 구현했다:

```python
class PersonalizedLearningAgent:
    def __init__(self):
        self.user_profiles = {}
        self.learning_graph = self._build_learning_graph()
    
    async def _generate_answer(
        self, 
        query: str, 
        docs: List[Document], 
        user_level: str
    ):
        """사용자 레벨에 맞춘 답변 생성"""
        
        # 레벨별 프롬프트 템플릿
        prompts = {
            "beginner": """
당신은 친절한 시니어 개발자입니다. 신입 개발자가 이해하기 쉽게 설명해주세요.

규칙:
1. 전문 용어가 나오면 쉬운 말로 풀어서 설명
2. 구체적인 예시 코드 제공
3. 단계별로 차근차근 설명
4. 관련된 기초 개념도 함께 언급

컨텍스트: {context}
질문: {question}
답변:""",

            "intermediate": """
당신은 숙련된 개발자입니다. 실무 경험이 있는 개발자에게 적절한 수준으로 답변하세요.

규칙:
1. 핵심 포인트를 명확하게 전달
2. 베스트 프랙티스와 주의사항 포함
3. 대안적 접근법도 제시
4. 성능이나 보안 관점에서의 고려사항 언급

컨텍스트: {context}
질문: {question}
답변:""",

            "advanced": """
당신은 시니어 아키텍트입니다. 고급 개발자에게 심도 있는 답변을 제공하세요.

규칙:
1. 아키텍처 관점에서의 분석
2. 트레이드오프와 설계 결정 근거 제시
3. 확장성, 유지보수성 고려사항
4. 최신 트렌드나 발전 방향 언급

컨텍스트: {context}
질문: {question}
답변:""",
        }
        
        # 컨텍스트 구성
        context = self._format_context(docs, user_level)
        
        # 프롬프트 생성
        prompt = prompts[user_level].format(
            context=context,
            question=query
        )
        
        # LLM 호출
        response = await self.llm.agenerate(prompt)
        
        return response
    
    def _format_context(self, docs: List[Document], user_level: str) -> str:
        """사용자 레벨에 맞춰 컨텍스트 포맷팅"""
        
        # 난이도별 문서 필터링
        if user_level == "beginner":
            filtered_docs = [
                doc for doc in docs 
                if doc.metadata.get('difficulty_level') in ['beginner', 'intermediate']
            ]
        elif user_level == "intermediate":
            filtered_docs = docs  # 모든 레벨
        else:  # advanced
            filtered_docs = [
                doc for doc in docs 
                if doc.metadata.get('difficulty_level') in ['intermediate', 'advanced']
            ]
        
        # 컨텍스트 구성
        context_parts = []
        for doc in filtered_docs:
            source = doc.metadata.get('source_file', 'unknown')
            content = doc.content
            keywords = ', '.join(doc.metadata.get('keywords', []))
            
            context_parts.append(f"""
[출처: {source}]
[키워드: {keywords}]
{content}
""")
        
        return "\n\n".join(context_parts)
```

## 시스템 통합 및 배포

### FastAPI 기반 서비스

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="OJT RAG API v2.0")

class QueryRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    user_level: str = "beginner"
    include_sources: bool = True

class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]
    confidence: float
    suggestions: List[str]
    conversation_id: str

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        result = await rag_system.process_query(
            query=request.question,
            conversation_id=request.conversation_id,
            user_level=request.user_level
        )
        
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"] if request.include_sources else [],
            confidence=result["confidence"],
            suggestions=result["suggestions"],
            conversation_id=result.get("conversation_id", "")
        )
    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    metadata: dict = Body(...),
    background_tasks: BackgroundTasks
):
    """문서 업로드 및 비동기 처리"""
    
    # 파일 저장
    file_path = f"./uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 백그라운드에서 문서 처리
    background_tasks.add_task(
        process_new_document,
        file_path,
        metadata
    )
    
    return {"message": "Document upload initiated", "file": file.filename}

async def process_new_document(file_path: str, metadata: dict):
    """백그라운드 문서 처리"""
    try:
        # 문서 파싱 및 청킹
        chunks = await doc_processor.process_document(file_path, metadata)
        
        # 벡터 DB에 추가
        await rag_system.add_documents(chunks)
        
        # 처리 완료 로그
        logger.info(f"Document processed successfully: {file_path}")
        
    except Exception as e:
        logger.error(f"Document processing failed: {file_path}, Error: {str(e)}")
```

### 실시간 모니터링

```python
import prometheus_client
from prometheus_client import Counter, Histogram, Gauge

# 메트릭 정의
QUERY_COUNT = Counter('rag_queries_total', 'Total RAG queries', ['user_level'])
QUERY_LATENCY = Histogram('rag_query_duration_seconds', 'Query processing time')
RETRIEVAL_ACCURACY = Gauge('rag_retrieval_accuracy', 'Retrieval accuracy score')
ANSWER_CONFIDENCE = Histogram('rag_answer_confidence', 'Answer confidence scores')

class RAGMonitor:
    def __init__(self):
        self.metrics = {
            'query_count': QUERY_COUNT,
            'query_latency': QUERY_LATENCY,
            'retrieval_accuracy': RETRIEVAL_ACCURACY,
            'answer_confidence': ANSWER_CONFIDENCE
        }
    
    def record_query(self, user_level: str, latency: float, confidence: float):
        """쿼리 메트릭 기록"""
        self.metrics['query_count'].labels(user_level=user_level).inc()
        self.metrics['query_latency'].observe(latency)
        self.metrics['answer_confidence'].observe(confidence)
    
    def update_accuracy(self, accuracy_score: float):
        """검색 정확도 업데이트"""
        self.metrics['retrieval_accuracy'].set(accuracy_score)

# 메트릭 엔드포인트
@app.get("/metrics")
async def metrics():
    return Response(
        prometheus_client.generate_latest(),
        media_type="text/plain"
    )
```

## 성능 평가 및 결과

### A/B 테스트 설정

기존 시스템과 새 시스템을 3주간 병렬 운영하며 비교했다:

```python
# A/B 테스트 결과
test_results = {
    "기존_RAG": {
        "정확도": 0.67,
        "응답시간": "2.3초",
        "사용자_만족도": 3.2,
        "재질문_비율": 0.45
    },
    "Kotaemon_RAG": {
        "정확도": 0.89,
        "응답시간": "1.1초",
        "사용자_만족도": 4.6,
        "재질문_비율": 0.18
    },
    "개선율": {
        "정확도": "+33%",
        "응답시간": "-52%",
        "사용자_만족도": "+44%",
        "재질문_비율": "-60%"
    }
}
```

### 주요 개선 사항

1. **검색 정확도**: 
   - 하이브리드 검색으로 맥락 이해 능력 향상
   - 재랭킹 모델로 노이즈 문서 제거

2. **답변 품질**:
   - 사용자 레벨별 맞춤 설명
   - 코드 예시와 단계별 가이드 제공

3. **학습 추적**:
   - 개인별 대화 기록 저장
   - 학습 진도와 이해도 분석

## 운영 중 마주친 챌린지

### 1. 토큰 길이 제한
GPT-4의 컨텍스트 윈도우 제한으로 긴 문서 처리가 어려웠다:

```python
def smart_context_truncation(docs: List[Document], max_tokens: int = 16000):
    """중요도 기반 컨텍스트 단축"""
    
    # 1. 문서별 중요도 점수 계산
    scored_docs = []
    for doc in docs:
        score = (
            doc.metadata.get('relevance_score', 0) * 0.4 +
            doc.metadata.get('recency_score', 0) * 0.3 +
            doc.metadata.get('authority_score', 0) * 0.3
        )
        scored_docs.append((score, doc))
    
    # 2. 점수순 정렬 후 토큰 제한까지 선택
    sorted_docs = sorted(scored_docs, key=lambda x: x[0], reverse=True)
    
    selected_docs = []
    current_tokens = 0
    for score, doc in sorted_docs:
        doc_tokens = estimate_tokens(doc.content)
        if current_tokens + doc_tokens <= max_tokens:
            selected_docs.append(doc)
            current_tokens += doc_tokens
        else:
            break
    
    return selected_docs
```

### 2. 실시간 평가의 오버헤드
모든 답변에 대해 실시간 평가를 수행하니 지연시간이 증가했다:

```python
class AdaptiveEvaluator:
    def __init__(self):
        self.evaluation_queue = asyncio.Queue()
        self.should_evaluate_realtime = self._should_evaluate_realtime
        
    async def conditional_evaluate(self, query: str, answer: str, docs: List[Document]):
        """조건부 실시간 평가"""
        
        # 실시간 평가 조건
        if self.should_evaluate_realtime(query, answer):
            return await self.evaluator.evaluate(query, docs, answer)
        else:
            # 백그라운드 평가 큐에 추가
            await self.evaluation_queue.put({
                'query': query,
                'answer': answer,
                'docs': docs,
                'timestamp': time.time()
            })
            return {"confidence": 0.8}  # 기본값 반환
    
    def _should_evaluate_realtime(self, query: str, answer: str) -> bool:
        """실시간 평가 필요 여부 판단"""
        
        # 1. 중요한 질문 (보안, 설정 등)
        important_keywords = ["보안", "설정", "배포", "권한", "에러"]
        if any(keyword in query for keyword in important_keywords):
            return True
            
        # 2. 짧은 답변 (빠른 평가 가능)
        if len(answer) < 500:
            return True
            
        # 3. 확신도가 낮은 답변
        if self._estimate_uncertainty(answer) > 0.3:
            return True
            
        return False
```

## 마무리

이번 OJT 리팩토링 프로젝트는 단순히 기술적 개선을 넘어서 학습자 중심의 사고를 하게 된 계기였다. 

**핵심 깨달음:**
1. **사용자 레벨 고려**: 같은 질문이라도 경험에 따라 답변 방식이 달라야 함
2. **점진적 개선**: 완벽한 시스템을 한 번에 구축하기보다는 측정-개선-반복
3. **도메인 특화**: 범용 RAG보다는 OJT에 특화된 커스터마이징이 더 효과적

Kotaemon 프레임워크의 모듈러 설계 덕분에 빠르게 프로토타이핑할 수 있었고, 실제 사용자 피드백을 통해 지속적으로 개선해 나갈 수 있었다.

다음 단계로는 멀티모달 지원(이미지, 영상 기반 튜토리얼)과 실시간 학습 경로 추천 기능을 계획하고 있다. 개발자의 학습 여정을 돕는 AI의 가능성은 무궁무진하다! 🎯