## 의미 기반으로 분할하는 시맨틱 청킹

`SemanticChunker` 는 텍스트를 단순히 길이에 따라 나누는 것이 아닌, 의미적으로 유사한 내용을 가진 청크로 분할하는 도구이다. 텍스트를 문장 단위로 분할한 후, 서로 유사한 의미를 가진 문장들을 그룹화하여 하나의 청크로 구성한다. 이를 통해 문맥이 잘 연결된 상태로 분할되어, 텍스트의 의미를 보존하면서도 적절한 크기의 청크를 생성할 수 있다.

의미 분할 방식은 청크가 문맥적으로 일관성을 갖도록 하여 이후의 자연어 처리나 정보 검색에서 더욱 정확한 결과를 얻을 수 있다. 특히, RAG와 같은 작업에서 문맥이 잘 연결된 청크들이 입력되면, 모델의 응답 정화도가 크게 향상될 수 있다.

```python
from langChain_experimental.text_splitter import SemanticChunker
```

SemanticChunker 의 기본 파라미터는 `breakpoint_threshold_type='percentile'` 과 `breakpoint_threshold_amount=95` 로 설정되어 있다. 이는 의미적 차이의 분포에서 95번째 백분위수를 초과하는 지점, 즉 상위 5%에 해당하는 