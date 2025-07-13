OpenSearch의 워크플로 자동화 기능을 실제로 어떻게 활용하는지 알아보기 위해, Chain-of-Thought(CoT) 에이전트를 사용한 대화형 챗봇을 구축하는 완전한 예제를 살펴본다.

## 워크플로 개념 이해

**에이전트**는 머신러닝 모델과 도구들을 조율하고 실행하는 역할을 한다. **도구**는 특정한 작업들을 수행하는 구성 요소다. 이 둘의 조합으로 복잡한 AI 애플리케이션을 구축할 수 있다.

### 워크플로 구조

CoT 챗봇을 구축하려면 다음과 같은 단계가 필요하다.

1. **모델 배포**: 외부 모델에 연결하고 클러스터에 배포
2. **도구 설정**: 다양한 기능을 수행할 도구들 생성
3. **에이전트 구성**: 도구들을 사용할 에이전트들 등록
4. **통합**: 모든 구성 요소를 하나의 루트 에이전트로 연결

## 실제 워크플로 구현

### 1단계: 클러스터에 모델 배포

모델을 사용하기 위해서는 커넥터 생성, 모델 등록, 배포 과정을 거쳐야 한다.

**create_connector_1: 외부 모델 커넥터 생성**

```yaml
- id: create_connector_1
  type: create_connector
  user_inputs:
    name: OpenAI Chat Connector
    description: The connector to public OpenAI model service for GPT 3.5
    version: '1'
    protocol: http
    parameters:
      endpoint: api.openai.com
      model: gpt-3.5-turbo
    credential:
      openAI_key: '12345'
    actions:
    - action_type: predict
      method: POST
      url: https://${parameters.endpoint}/v1/chat/completions
```

이 단계에서는 OpenAI의 GPT-3.5 모델에 접근할 수 있는 커넥터를 생성한다. 커넥터가 생성되면 `connector_id`가 반환된다.

**register_model_2: 모델 등록**

```yaml
- id: register_model_2
  type: register_remote_model
  previous_node_inputs:
    create_connector_1: connector_id
  user_inputs:
    name: openAI-gpt-3.5-turbo
    function_name: remote
    description: test model
```

이전 단계에서 생성된 `connector_id`를 사용해 모델을 등록한다. `previous_node_inputs` 필드를 통해 자동으로 연결된다.

**deploy_model_3: 모델 배포**

```yaml
- id: deploy_model_3
  type: deploy_model
  previous_node_inputs:
    register_model_2: model_id
```

등록된 모델을 실제로 메모리에 배포한다. 이 단계가 완료되면 모델을 추론에 사용할 수 있다.

### 2단계: 추론을 위한 도구와 에이전트 설정

배포된 모델을 활용해 다양한 도구와 에이전트를 구성한다.

**list_index_tool: 인덱스 정보 도구**

```yaml
- id: list_index_tool
  type: create_tool
  user_inputs:
    name: ListIndexTool
    type: ListIndexTool
    parameters:
      max_iteration: 5
```

이 도구는 OpenSearch 인덱스 정보를 가져오는 기능을 제공한다. 다른 단계에 의존하지 않으므로 독립적으로 생성된다.

**sub_agent: 하위 에이전트 생성**

```yaml
- id: sub_agent
  type: register_agent
  previous_node_inputs:
    deploy_model_3: model_id
    list_index_tool: tools
  user_inputs:
    name: Sub Agent
    type: conversational
    description: this is a test agent
    parameters:
      hello: world
    llm.parameters:
      max_iteration: '5'
      stop_when_no_tool_found: 'true'
    memory:
      type: conversation_index
    app_type: chatbot
```

배포된 모델과 인덱스 도구를 사용하는 에이전트를 생성한다. 이 에이전트는 나중에 다른 에이전트의 도구로 사용될 수 있다.

**agent_tool: 에이전트를 도구로 변환**

```yaml
- id: agent_tool
  type: create_tool
  previous_node_inputs:
    sub_agent: agent_id
  user_inputs:
    name: AgentTool
    type: AgentTool
    description: Agent Tool
    parameters:
      max_iteration: 5
```

하위 에이전트를 도구로 감싸서 다른 에이전트에서 사용할 수 있게 한다. 이는 에이전트의 중첩 구조를 만들 때 유용하다.

**ml_model_tool: ML 모델 도구**

```yaml
- id: ml_model_tool
  type: create_tool
  previous_node_inputs:
    deploy_model_3: model_id
  user_inputs:
    name: MLModelTool
    type: MLModelTool
    alias: language_model_tool
    description: A general tool to answer any question.
    parameters:
      prompt: Answer the question as best you can.
      response_filter: choices[0].message.content
```

배포된 ML 모델을 직접 사용할 수 있는 도구를 생성한다. 이 도구는 일반적인 질문에 답변하는 데 사용된다.

**root_agent: 최종 루트 에이전트**

```yaml
- id: root_agent
  type: register_agent
  previous_node_inputs:
    deploy_model_3: model_id
    ml_model_tool: tools
    agent_tool: tools
  user_inputs:
    name: DEMO-Test_Agent_For_CoT
    type: conversational
    description: this is a test agent
    parameters:
      prompt: Answer the question as best you can.
    llm.parameters:
      max_iteration: '5'
      stop_when_no_tool_found: 'true'
    tools_order: ['agent_tool', 'ml_model_tool']
    memory:
      type: conversation_index
    app_type: chatbot
```

모든 도구를 통합하는 최종 에이전트다. `tools_order` 필드를 통해 도구 사용 순서를 지정할 수 있다.

## 워크플로 그래프와 자동 연결

OpenSearch는 `previous_node_inputs` 설정을 바탕으로 자동으로 방향성 비순환 그래프(DAG)를 생성한다. 예를 들어:

```yaml
edges:
- source: create_connector_1
  dest: register_model_2
- source: register_model_2
  dest: deploy_model_3
- source: deploy_model_3
  dest: sub_agent
- source: list_index_tool
  dest: sub_agent
- source: sub_agent
  dest: agent_tool
- source: deploy_model_3
  dest: ml_model_tool
- source: deploy_model_3
  dest: root_agent
- source: ml_model_tool
  dest: root_agent
- source: agent_tool
  dest: root_agent
```

이러한 연결을 통해 각 단계의 출력이 다음 단계의 입력으로 자동 전달된다.

## 완전한 템플릿 구조

### 메타데이터 정의

```yaml
name: tool-register-agent
description: test case
use_case: REGISTER_AGENT
version:
  template: 1.0.0
  compatibility:
  - 2.12.0
  - 3.0.0
```

템플릿의 기본 정보와 호환성을 정의한다.

### 워크플로 정의

```yaml
workflows:
  provision:
    nodes:
      # 모든 단계들이 여기에 나열됨
    edges:
      # 자동 생성되는 연결 관계들
```

`provision` 워크플로 아래에 모든 단계와 연결 관계가 정의된다.

## 실제 활용 시나리오

이렇게 구성된 챗봇은 다음과 같은 방식으로 작동한다:

1. **사용자 질문 접수**: 루트 에이전트가 사용자의 질문을 받는다
2. **도구 선택**: 설정된 순서에 따라 적절한 도구를 선택한다
3. **작업 처리**: 에이전트 도구나 ML 모델 도구를 통해 작업을 처리한다
4. **응답 생성**: 처리 결과를 바탕으로 사용자에게 응답을 제공한다

## 템플릿 형식

동일한 워크플로를 YAML 또는 JSON 형식으로 작성할 수 있다. YAML이 더 읽기 쉽지만, JSON이 프로그래밍적으로 처리하기 편할 수 있다.

## 확장 가능성

이 기본 구조를 바탕으로 다음과 같은 확장이 가능하다:

- **추가 도구 통합**: 검색, 계산, 외부 API 호출 등의 도구 추가
- **복잡한 에이전트 체인**: 여러 단계의 에이전트 연결
- **조건부 실행**: 특정 조건에 따른 다른 경로 실행
- **병렬 처리**: 독립적인 작업들의 동시 실행

## 마무리

OpenSearch의 워크플로 자동화를 통해 복잡한 AI 애플리케이션을 체계적으로 구축할 수 있다. Chain-of-Thought 챗봇 예제에서 보듯이, 각 구성 요소가 명확하게 분리되고 자동으로 연결되어 유지보수성과 재사용성이 높은 시스템을 만들 수 있다.

이러한 템플릿 기반 접근 방식은 개발 시간을 단축하고, 일관성 있는 배포를 보장하며, 팀 간 협업을 용이하게 한다. 특히 복잡한 AI 파이프라인을 구축할 때 그 효과가 크게 나타난다.