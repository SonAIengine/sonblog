KoBERT는 BERT 모델에서 한국어 데이터를 추가로 학습시킨 모델로, 한국어 위키에서 5백만개의 문장과 54백만개의 단어를 학습시킨 모델이다. 따라서 한국어 데이터에 대해서도 높은 정확도를 낼 수 있다고 한다.

이러한 BERT의 큰 특징은 방대한 양의 데이터(약 33억개 단어)로 먼저 학습(pretrain)되었다는 것과, 자신의 사용 목적에 따라 파인튜닝(finetuning)이 가능하다는 점이다. 따라서 output layer만 추가로 달아주면 원하는 결과를 출력해내는 기계번역 모델을 만들어 낼 수 있다.

```python
class BERTDataset(Dataset):
    def __init__(self, dataset, sent_idx, label_idx, bert_tokenizer, max_len,
                 pad, pair):
        transform = nlp.data.BERTSentenceTransform(
            bert_tokenizer, max_seq_length=max_len, pad=pad, pair=pair)

        self.sentences = [transform([i[sent_idx]]) for i in dataset]
        self.labels = [np.int32(i[label_idx]) for i in dataset]

    def __getitem__(self, i):
        return (self.sentences[i] + (self.labels[i], ))

    def __len__(self):
        return (len(self.labels))
```

하이퍼 파라미터들을 조정해준다.

```python
# Setting parameters
max_len = 64
batch_size = 64
warmup_ratio = 0.1
num_epochs = 5
max_grad_norm = 1
log_interval = 200
learning_rate =  5e-5
```

이제 버트토크나이저와 위에서 정의한 클래스를 적용해 토큰화와 패딩을 해준다.

```python
#토큰화
tokenizer = get_tokenizer()
tok = nlp.data.BERTSPTokenizer(tokenizer, vocab, lower=False)

data_train = BERTDataset(dataset_train, 0, 1, tok, max_len, True, False)
data_test = BERTDataset(dataset_test, 0, 1, tok, max_len, True, False)
```

> print(data_train[0]) 실행

```python
>>(array([   2, 1189,  517, 6188, 7245, 7063,  517,  463, 3486, 7836, 5966,
        1698,  517, 6188, 7245, 7063,  517,  463, 1281, 7870, 1801, 6885,
        7088, 5966, 1698, 5837, 5837,  517, 6188, 7245, 6398, 6037, 7063,
         517,  463,  517,  463,  517,  364,  517,  364,    3,    1,    1,
           1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
           1,    1,    1,    1,    1,    1,    1,    1,    1], dtype=int32),
 array(42, dtype=int32),
 array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
       dtype=int32), 5)
```

출력값들을 보면 3개의 array가 출력되는데, 첫 번째는 패딩된 시퀀스, 두 번째는 길이와 타입에 대한 내용, 세 번재는 어텐션 마스크 시퀀스이다.