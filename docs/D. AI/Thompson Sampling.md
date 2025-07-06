다양한 선택지(arm)를 실험하면서 최적의 전략을 찾는 **Multi‑Armed Bandit** 문제를 베이지안 방식으로 해결하는 기법이다.

탐색(exploration)과 활용(exploitation)을 자연스럽게 균형 있게 수행하는 알고리즘으로, A/B 테스트, 광고 클릭 예측, 추천 시스템 등에 널리 쓰입니다.

- **베이지안 추론 기반**  
    각 arm의 성공 확률을 확률 변수 θ로 보고, 사전(prior) 분포를 설정한 뒤, 실험 결과에 따라 사후(posterior) 분포를 업데이트합니다 [en.wikipedia.org+2velog.io+2brunch.co.kr+2](https://velog.io/%40rockgoat2/AB-Test-Thompson-Sampling?utm_source=chatgpt.com)[infossm.github.io+1yjjo.tistory.com+1](https://infossm.github.io/blog/2019/01/10/discounted-thompson-sampling/?utm_source=chatgpt.com).
    
- **베타 분포 사용 (이진 결과, 클릭/비클릭)**
    
    - 선택지 k에 대해 θₖ ∼ Beta(αₖ, βₖ)
        
    - 초기엔 α=1, β=1로 균등 분포 설정 [kukim.tistory.com+3velog.io+3brunch.co.kr+3](https://velog.io/%40rockgoat2/AB-Test-Thompson-Sampling?utm_source=chatgpt.com)[infossm.github.io](https://infossm.github.io/blog/2019/01/10/discounted-thompson-sampling/?utm_source=chatgpt.com)[kukim.tistory.com](https://kukim.tistory.com/205?utm_source=chatgpt.com)
        
- **반복적 샘플링 및 선택**
    
    - 각 arm마다 θₖ로부터 값 하나를 샘플링
        
    - 가장 큰 값의 arm을 선택 → 그 결과(클릭 여부)로 α 또는 β 값 업데이트