텍스트 데이터들이 필요하다.

data 딕셔너리의 train 키에서 document 값을 가져와 모든 문서를 하나의 문자열로 합친다.
이렇게 만들어진 전체 텍스트에서 중복을 제거하고 정렬된 고유한 문자 목록을 생성한다.

이 과정을 통해 데이터셋에 존재하는 모든 고유한 한국어 문자를 파악할 수 있다.

그 다음, 이 고유 문자 목록의 길이를 계산해 전체 어휘 크기를 구하고, 총 글자 수를 출력해 데이터셋의 어휘 다양성을 확인합니다.

다음으로, 문자와 인덱스를 매핑하는 딕셔너리를 생성한다. 이러한 매핑은 텍스트 데이터를 숫자로 변환하고 다시 텍스트로 복원하는 데 사용된다.

 `데이터를 텐서로 변환하고 데이터 타입을 long으로 지정하는 과정은 딥러닝 모델의 효율적인 학습과 처리를 위해서 중요하다. 텐서는 딥러닝에서 데이터를 표현하는 기본 단위로, 다차원 배열 형태로 데이터를 저장하고 처리한다. 문자열을 숫자로 인코딩하고 이를 텐서로 변환하는 과정은 모델이 텍스트 데이터를 이해하고 학습할 수 있도록 하는 필수적인 전처리 단계이다.`
 
`데이터 타입을 long으로 지정하는 이유는 주로 텍스트 데이터의 특성과 관련이 있다. 텍스트 데이터를 숫자로 인코딩할 때 각 단어나 토큰에 해당하는 정수 값이 큰 범위를 가질 수 있기 때문이다. long 타입은 32비트 정수형보다 더 큰 범위의 정수를 표현할 수 있어 큰 어휘 사전을 다룰 때 유용하다. 또한, 파이토치의 많은 함수들이 기본적으로 long 타입의 인덱스를 기대하기 때문에 이를 사용하면 추후 처리 과정에서의 호환성을 보장할 수 있다.`

`이러한 텐서 변환과 데이터 타입 지정은 모델이 데이터를 효율적으로 처리하고 GPU를 통한 빠른 연산을 가능하게 함으로써 모델의 성능과 학습 속도에 직접적인 영향을 준다.`

데이터의 타입을 모두 변경한 후, 다음 단계로 train 데이터셋과 test 데이터셋으로 나누는 작업을 수행한다.
이 과정은 머신러닝 모델의 학습과 평가를 위해 매우 중요하다.

데이터를 훈련용과 검증용으로 분리함으로써 모델의 성능을 객관적으로 평가하고 과적합을 방지할 수 있다.
훈련 데이터는 모델을 학습하는 데 사용되며, 검증 데이터는 학습된 모델의 성능을 테스트하는 데 활용된다.

이러한 분리 작업을 통해 모델이 새로운, 보지 못한 데이터에 대해 얼마나 잘 일반화되는지 확인할 수 있다.
데이터 분할 비율은 일반적으로 프로젝트의 특성과 데이터의 양에 따라 결정되지만, 보통 8:2 또는 9:1등의 비율로 훈련 데이터과 검증 데이터를 나누기도 한다.

데이터를 분할 때 데이터를 처음부터 마지막까지 순차적으로 훈련한다고 생각할 수 있지만, 실제 학습 과정은 그렇지 않다. 훈련 데이터는 block_size에 설정된 크기만큼의 청크(chunk) 단위로 무작위 샘플링해 학습을 진행한다. 데이터 블록(block) 단위로 나누는 것은 GPT와 같은 트랜스포머 기반 모델을 학습할 때 자주 사용하는 방법이다.

여기서 `block_size` 는 한 번에 모델이 처리할 수 있는 글자의 수를 정의한다. 예를 들어 `block_size`  를 8로 설정하면 모델은 데이터의 연속된 8개의 글자를 하나의 학습 단위로 이용한다. 

이러한 방식으로 데이터를 처리함으로써 모델은 **다양한 문맥에서 언어를 이해하고 생성하는 능력**을 키울 수 있다. 

또한 무작위 샘플링을 통해 모델이 데이터의 특정 부분에 과적합되는 것을 방지하고, 전체 데이터셋에 대해 고르게 학습할 수 있도록 한다.

`block_size` 를 8로 설정하고 데이터가 하나씩 언어 모델의 입력으로 어떻게 전달되는지 살펴보겠다.
흔히 `block_size` 를 컨텍스트 길이(context length)라고 부른다. 즉, 모데링 한 번에 처리할 수 있는 토큰의 최대 길이를 의미하며, 이는 모델의 성능과 효율성에 큰 영향을 미친다. 이 값을 적절히 설정하는 것은 모델의 학습과 추론 과정에서 매우 중요하다. 큰 `block_size` 는 모델이 더 긴 문맥을 이해할 수 있게 해주지만, 동시에 더 많은 계산 자원을 필요로 한다. 반면 작은 `block_size` 는 계산 효율성은 높일 수 있지만, 모델의 문맥 이해 능력을 제한할 수 있다. 따라서 주어진 사용 가능한 자원을 고려해 적절한 `block_size` 를 선택하는 것이 중요하다.

**train_dataset[:block_size]** 이런 식으로 훈련 데이터셋의 처음 8개 글자를 텐서 형태로 보여줄 수 있다. 이 텐서는 숫자 배열이며 각 숫자는 특정 글자를 나타낸다. **학습 과정에 이런 블록은 트랜스포머 모델이 각 글자 뒤에 나타날 글자를 예측하도록 돕니다.** 모델은 각 위치에서 글자를 예측하며, 이 과정을 통해 문장 구조와 언어 패턴을 학습한다. 예를 들어 모델에 1928이라고 인코딩된 텍스트 정보를 입력했다고 가정해보자, 모델은 1928이라는 숫자로 인코딩된 텍스트를 봤다면 다음 글자 2315를 예측할 때 1928을 사용하고, 그 다음 글자인 0을 예측할 때는 1928과 2315를 함께 사용해 예측하도록 훈련한다.


```python
x = train_dataset[:block_size]
y = train_dataset[1:block_size+1]

for time in range(block_size):
	context = x[:time+1]
	target = y[time]

	print(f"입력 텐서 : {context}")
	print(f"타깃 텐서 : {target}")
```

인공지능 모델 훈련 시에는 단일 글자 텐서만 입력으로 주어지지 않는다. 여러 개의 텐서가 함께 묶여 입력으로 제공된다. 이를 `배치(batch)` 라고 한다.


이제 `block_size` 와 `batch_size` 를 활용해 데이터가 어떻게 입력되는지 자세히 살펴보겠다.
배치 처리는 모델의 학습 효율을 높이는 중요한 기법으로, 여러 데이터 샘플을 동시에 처리함으로써 계산 속도를 향상시키고 모델의 일반화 능력을 개선한다.


`block_size` 는 각 텐서의 길이를 결정하고, `batch_size` 는 한 번에 처리할 텐서의 개수를 설정한다.
이 두 매개변수를 적절히 조절하면 모델의 학습 속도와 성능을 최적화할 수 있다.

### PyTorch 언어 모델 학습을 위한 배치 생성 예제

```python
torch.maunal_seed(1234)

batch_size = 4
block_size = 8

def batch_function(mode):
	dataset = train_dataset if mode == "train" else test_dataset
	idx = torch.randint(len(dataset) - block_size, (batch_size))
	x = torch.stack([dataset[index:index+block_size] for index in idx])
	y = torch.stack([dataset[index+1:index+block_size+1] for index in idx])
	return x, y

example_x, example_y = batch_function("train")

for size in range(batch_size):
	for t in range(block_size):
		context = example_x[size, :t+1]
		target = example_y[size, t]
		print(f"input : {context}, target : {target}")
```

이 코드는 PyTorch를 사용하여 언어 모델 학습을 위한 **미니 배치(batch)** 를 생성하고, 그 배치에서 각 타임스텝의 **입력(context)** 과 **타깃(target)** 을 출력하는 예제이다.

 `torch.manual_seed(1234)` 는 PyTorch의 난수 생성 시드를 고정하여 **재현 가능한 결과**를 만든다.

`batch_size = 4`, `block_size = 8`  
- **batch_size**: 학습에 사용할 문장 또는 시퀀스의 개수 (한 번에 처리할 데이터 수)
- **block_size**: 각 시퀀스(문장)의 길이. 즉, 시퀀스 하나는 8개의 토큰으로 구성됨

 #### 1. batch_function(mode)
 `train_dataset` 또는 `test_dataset` 중 하나에서 학습 배치를 만드는 함수이다.

```python
dataset = train_dataset if mode == "train" else test_dataset
```

- `mode`에 따라 사용할 데이터셋을 선택합니다.


```python
idx = torch.randint(len(dataset) - block_size, (batch_size))
```

- 데이터셋에서 block_size만큼의 연속된 구간을 추출할 **시작 인덱스**를 무작위로 `batch_size`개 만큼 선택한다.

```python
x = torch.stack([dataset[index:index+block_size] for index in idx])
y = torch.stack([dataset[index+1:index+block_size+1] for index in idx])
```

- `x`: `[index : index + block_size]` 범위 → 입력 시퀀스
- `y`: `[index+1 : index + block_size + 1]` 범위 → 타깃 시퀀스 (한 칸 오른쪽으로 shift된 값)


**예시**
- x: `[1, 2, 3, 4, 5, 6, 7, 8]`
- y: `[2, 3, 4, 5, 6, 7, 8, 9]`  
    → 언어 모델에서는 주어진 context로 다음 단어를 예측하므로 이렇게 한 칸씩 이동시킵니다.

 `example_x, example_y = batch_function("train")`

- 학습용 미니 배치를 하나 생성합니다.

#### 2. context와 target을 하나씩 출력

```python
for size in range(batch_size):
	for t in range(block_size):
		context = example_x[size, :t+1]
		target = example_y[size, t]
		print(f"input : {context}, target : {target}")
```

예시

- `example_x[size] = [10, 20, 30, 40, 50, 60, 70, 80]`
- `example_y[size] = [20, 30, 40, 50, 60, 70, 80, 90]`

출력은 다음과 같이 됨

```text
input : tensor([10]), target : 20
input : tensor([10, 20]), target : 30
input : tensor([10, 20, 30]), target : 40
...
input : tensor([10, 20, 30, 40, 50, 60, 70, 80]), target : 90
```

이 구조는 GPT 계열의 오토리그레시브 모델에서 학습 시 주어진 `context`로 다음 토큰을 예측하는 방식과 같습니다. 

요약하자면, 이 코드는 언어 모델 학습을 위해
- 입력 시퀀스와 타깃 시퀀스를 자동 생성하고
- 각 타임스텝에서 `context → target` 관계를 출력하는 데, 이 과정에서 각 배치와 블록에 대한 입력(컨텍스트)과 해당 타킷(목표 글자)이 출력하는 것을 의미한다.
- 이를 통해 주어진 컨텍스트를 바탕으로 다음 글자를 예측하는 방식으로 학습한다.
- 코드 실행 결과는 모델이 각 배치 시퀀스를 처리하며 텍스트 구조와 언어 패턴을 학습하는 과정을 보여준다.


지금까지 데이터가 모델에 어떤 방식으로 전달되는지 살펴봤다.

이제 간단한 언어 모델을 직접 만들고 실험하면서 인공지능이 어떻게 언어를 학습하는지 단계별로 살펴보자.
마치 레고를 조립하듯이 인공지능 기능을 순차적으로 추가하고 훈련하면서 각 모델의 성능이 어떻게 개선되는지 관찰할 예정이다.

이 과정을 통해 언어 모델의 기본 구조를 이해하고, 각 구성 요소가 모델의 성능에 어떤 영향을 미치는지 직접 확인할 수 있다. 먼저 가장 기본적인 형태의 언어 모델을 설정하고, 점진적으로 복잡한 기능을 추가하면서 그 변화를 관찰해보자. 이러한 단계별 접근 방식은 복잡한 인공지능 시스템의 작동 원리를 더 쉽게 이해할 수 있게 해준다.

각 단계에서 모델 성능을 평가하고 분석해, 언어 모델의 발전 과정과 각 요소의 중요성을 깊이 있게 파악할 수 있다.


### 언어 모델 만들기
semiGPT 클래스를 만드는 과정은 객체 지향 프로그래밍의 기본 원칙을 따른다. 
- 첫 번째는 `__init__` 메서드로, 클래스의 초기화를 담당
- 두 번째는 `forward` 메서드로, 모델 실제 연산을 수행한다. `__init__` 메서드에서는 모델의 구조와 초기 파라미터를 설정하고, `forward` 메서드에서는 입력 데이터를 받아 모델을 통과시켜 출력을 생성한다.

이러한 구조는 파이토치와 같은 딥러닝 프레임워크에서 일반적으로 사용되는 방식으로, 모델의 구조를 명확하게 정의하고 사용하기 쉽게 만든다. 이렇게 설계된 semiGPT 클래스는 다양한 언어 모델링 작업에 활용될 수 있으며, 필요에 따라 쉽게 확장하거나 수정이 가능하다.

```python
import torch
import torch.nn
from torch.nn import functional as F

class semiGPT(nn.Moudle):
	def __init__(self, vocab_length):
		super().__init__()
		self.embedding_token_table == nn.Embedding(vocab_lengthm vocab_length)
	
	def forward(self, inputs, targets):
		logits = self.embedding_token_table(inputs)
		
		return logits

model = semiGPT(ko_vocab_size)
output = model(example_x, example_y)
print(output.shape)
```

> 결과: torch.Size([4,8,2701])

먼저, 큰 흐름을 살펴보고 코드를 살펴보겠다.
semiGPT는 `__init__` 함수에서 `vocab_length` 를 (매개)변수로 받아 토큰 임베딩(embedding) 테이블을 만든다. 여기서 `vocab_length`는 모델이 다룰 수 있는 단어의 총 개수이므로 2701개가 된다.

임베딩 테이블은 각 단어를 고유한 숫자 벡터로 변환하는 역할을 한다. 이를 코드로 구현한 부분이 
`self.token_embedding_table = nn.Embedding(vocab_length, vocab_length)` 이다.

이 코드를 더 자세히 살펴보면 `nn.Embedding`은 파이토치에서 제공하는 기능으로, 
단어를 벡터로 변환하는 테이블을 만든다. 

첫 번째 `vocab_length`는 총 단어의 수를 의미하고, 
두 번째 `vocab_length`는 각 단어를 표현할 벡터의 크기를 나타낸다.

예를 들어, 전체 단어가 1,000개이고 각 단어를 100차원의 벡터로 표현하고 싶다면 `nn.Embedding(1000, 100)` 과 같이 설정된다. 이렇게 하면 각 단어마다 100개의 숫자로 이뤄진 고유한 벡터가 할당된다.

이 임베딩 테이블을 통해 텍스트 데이터를 컴퓨터가 이해하고 처리할 수 있는 형태로 변환할 수 있다. 이러한 과정을 거쳐 컴퓨터는 텍스트 데이터를 효과적으로 분석하고 처리할 수 있게 된다.

이러한 **임베딩 과정이 중요한 이유**는 다음과 같다.

첫째, 컴퓨터는 원래 숫자만을 이해하고 처리할 수 있어 임베딩을 통해 단어를 숫자 벡터로 변환하면 컴퓨터가 이해할 수 있는 형태가 된다.

둘째, 벡터 표현은 단어 간의 의미적


