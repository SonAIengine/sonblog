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