다양한 선택지(arm)를 실험하면서 최적의 전략을 찾는 **Multi‑Armed Bandit** 문제를 베이지안 방식으로 해결하는 기법이다.

탐색(exploration)과 활용(exploitation)을 자연스럽게 균형 있게 수행하는 알고리즘으로, A/B 테스트, 광고 클릭 예측, 추천 시스템 등에 널리 쓰입니다.

- **베이지안 추론 기반**  
    각 arm의 성공 확률을 확률 변수 θ로 보고, 사전(prior) 분포를 설정한 뒤, 실험 결과에 따라 사후(posterior) 분포를 업데이트한다.
    
- **베타 분포 사용 (이진 결과, 클릭/비클릭)**
    - 선택지 k에 대해 θₖ ∼ Beta(αₖ, βₖ)
    - 초기엔 α=1, β=1로 균등 분포 설정

- **반복적 샘플링 및 선택**
    - 각 arm마다 θₖ로부터 값 하나를 샘플링
    - 가장 큰 값의 arm을 선택 → 그 결과(클릭 여부)로 α 또는 β 값 업데이트

### Bernoulli (이진) 사례 흐름
- **초기화**  
    모든 arm k에 대해 (αₖ, βₖ) = (1, 1).
    
- **매 라운드 수행**
    - θ̂ₖ ~ Beta(αₖ, βₖ) 샘플링
    - 𝑘* = argmaxₖ θ̂ₖ 인 arm을 선택
    - 클릭(r=1)하면 αₖ* += 1, 클릭없으면 βₖ* += 1
    - posterior를 새로운 prior로 사용
        
- **수렴 효과**  
    샘플링이 반복될수록 분포는 실제 클릭률 근처로 좁혀지고, 더 높은 성공률의 arm이 자주 선택되게 됩니다 [velog.io+5infossm.github.io+5jhk0530.medium.com+5](https://infossm.github.io/blog/2019/01/10/discounted-thompson-sampling/?utm_source=chatgpt.com).