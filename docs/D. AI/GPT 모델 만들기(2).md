## 셀프 어텐션 추가하기
어텐션 메커니즘은 간단히 말해 문자나 단어 사이의 관계를 파악하고, 특정 정보의 중요성을 인식하는 메커니즘이다. 이 메커니즘을 이해하려면 두 가지 핵심 질문을 고민해야 한다.

1. **어떻게 단어 사이의 관계를 파악할 수 있을까?**
2. **어떻게 특정 정보의 중요성을 모델에 전달할 수 있을까?**

이러한 고민을 실제 코드로 구현해 보면 어텐션 메커니즘의 작동 원리를 더 깊이 이해할 수 있다. 코드를 통해 이론적 개념을 실제로 적용해 보면서 어텐션 메커니즘이 어떻게 작동하는지 더 명확하게 파악할 수 있다. 

먼저 문자들 간의 정보를 주고받는 방법을 생각해보겠다.

### 문자들 간에 정보를 주고받는 방식(평균 방식)
간단한 숫자 데이터를 가지고, 문자들 간에 정보를 주고받는 방법을 살펴보겠다.

배치(batch) 크기가 2이고, 시퀀스(sequence) 길이가 4, 그리고 임베딩(embedding) 차원이 6인 데이터를 생성한다. 데이터의 내용은 중요하지 않기 떄문에 `torch.randn` 함수를 사용해 랜덤한 값으로 데이터를 만듭니다. 이렇게 생성된 4개의 시퀀스는 서로 연관성이 없는 랜덤한 숫자들로 구성된다.

```python
import torch
torch.manual_seed(1441)

num_batches, seqence_length, embedding_dim = 2, 4, 6
embeddings_tensor = torch.randn(num_batches,
								seqence_length,
								embedding_dim)

embeddings_tensor.shape
```

> torch.Size([2, 4, 6])

이 코드의 목표는 더 나은 예측을 위해 시퀀스들이 서로 어떻게 정보를 주고받을 수 있는지를 알아보는 것이다. 여기서 주목할 점은 4개의 시퀀스가 순차적으로 입력된다는 것이다. 시퀀스들끼리 정보를 주고받는 방법은 코사인 유사도 등 다양하지만, 여기서는 가장 쉬운 방법인 평균을 구하는 방식으로 설명하겠다.

다음으로, embeddings_tensor 를 활용해 averaged_embeddings 라는 변수를 생성한다.
이 변수는 다음 시퀀스로 넘어갈 때마다 평균값을 사용하도록 설계된다.

~~~python
# 이전 임베딩의 평균을 저장할 텐서 초기화 
averaged_embeddings = torch.zeros((num_batches, sequence_length, embedding_dim))

# 각 배치에 대해 반복
for batch_index in range(num_batches):
	# 각 시퀀스 위치에 대해 반복
	for sequence_position in range(sequence_length):
		# 현재 시퀀스 위치까지의 이전 임베딩을 슬라이스
		previous_embeddings = embeddings_tensor[batch_index, :sequence_position + 1]
		# 현재 위치까지의 임베딩의 평균을 계산
		averaged_embeddings[batch_index, sequence_position] = torch.mean(
			previous_embeddings,
			dim=0
		)
~~~

이 과정에서 각 시퀀스의 정보를 압축해 다음 시퀀스로 전달할 수 있다. 임베딩의 중요성이 여기서 드러난다.
임베딩은 단어나 문자를 숫자 벡터로 표현하는 방법이다. 왕을 나타내는 입베딩과 여자를 나타내는 임베딩을 더하면 여왕의 임베딩이 나오는 것을 의미한다.

