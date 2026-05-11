# Skill: Antigravyty - Arquitetura Limpa e Engenharia de Software

## Descrição
Esta skill fornece diretrizes e melhores práticas para a implementação de um aplicativo de gestão de projetos, utilizando uma arquitetura limpa com **Backend em Rust** e **Frontend em Ruby**. O objetivo é garantir um desenvolvimento modular, testável, manutenível e escalável, seguindo os princípios mais atuais da Engenharia de Software.

## 1. Princípios da Arquitetura Limpa (Clean Architecture)

O projeto deve aderir aos princípios da Arquitetura Limpa, conforme proposto por Robert C. Martin (Uncle Bob). Isso implica uma clara separação de preocupações em camadas concêntricas, onde as dependências fluem apenas para dentro (da camada externa para a interna).

### 1.1. Camadas da Arquitetura

| Camada | Descrição | Tecnologias/Responsabilidades |
| :--- | :--- | :--- |
| **Entidades (Entities)** | Regras de negócio corporativas. | Modelos de domínio puros, independentes de framework. |
| **Casos de Uso (Use Cases)** | Regras de negócio da aplicação. | Orquestra o fluxo de dados para as entidades. |
| **Adaptadores de Interface (Interface Adapters)** | Converte dados entre casos de uso e frameworks. | Controladores, Presenters, Gateways, DTOs. |
| **Frameworks e Drivers** | Ferramentas externas (banco de dados, web, UI). | Bancos de dados, frameworks web (Axum, Rails), UI. |

### 1.2. A Regra da Dependência
A regra fundamental é que as dependências devem sempre apontar para dentro. Nenhuma entidade ou caso de uso deve ter conhecimento de frameworks, bancos de dados ou interfaces de usuário. Isso garante que as regras de negócio permaneçam independentes de detalhes de implementação.

## 2. Melhores Práticas para o Backend (Rust)

O backend em Rust será responsável pela lógica de negócio crítica, persistência de dados e exposição de APIs de alta performance.

### 2.1. Framework Web
- **Axum:** Preferencial devido à sua ergonomia, integração com o ecossistema `tower` e forte comunidade. Oferece um bom equilíbrio entre performance e facilidade de uso para APIs REST e gRPC.

### 2.2. Acesso a Dados
- **SQLx:** Para interação assíncrona e segura com bancos de dados relacionais. Garante segurança em tempo de compilação para consultas SQL.
- **Diesel:** Alternativa robusta para ORM, se preferir uma abordagem mais orientada a objetos para o banco de dados.

### 2.3. Design de API
- **gRPC:** Para comunicação inter-serviços de alta performance e baixa latência. Utilize Protocol Buffers para definição de contratos de serviço.
- **REST/JSON:** Para APIs públicas ou quando a simplicidade é prioritária. Documente com OpenAPI (Swagger).

### 2.4. Tratamento de Erros
- Utilize tipos de erro customizados com `thiserror` ou `anyhow` para tratamento de erros robusto e propagação clara.

### 2.5. Testes
- **Testes Unitários:** Para funções e módulos individuais, garantindo a correção da lógica de negócio.
- **Testes de Integração:** Para verificar a interação entre componentes do backend (ex: API e banco de dados).

## 3. Melhores Práticas para o Frontend (Ruby)

O frontend em Ruby será responsável pela renderização da interface do usuário, gerenciamento de sessões e consumo das APIs do backend Rust.

### 3.1. Framework Web
- **Ruby on Rails:** Utilizado como um servidor de frontend, aproveitando suas capacidades de renderização de views e gerenciamento de ativos.

### 3.2. Consumo de API
- **Faraday:** Biblioteca flexível para fazer requisições HTTP ao backend Rust. Permite o uso de middlewares para logging, retries e circuit breakers.
- **HTTP.rb:** Alternativa leve e performática para requisições HTTP.

### 3.3. Interatividade da UI
- **Hotwire (Turbo e Stimulus):** Para criar interfaces dinâmicas e responsivas sem a necessidade de um framework JavaScript complexo como React. Permite atualizações de UI via WebSockets, mantendo a lógica no servidor Ruby.

### 3.4. Testes
- **Testes de Feature/End-to-End:** Com Capybara e RSpec, para simular a interação do usuário com a interface e garantir o fluxo completo da aplicação.
- **Testes de Unidade:** Para helpers, view components e lógica de frontend específica.

## 4. Padrões de Integração e Comunicação

### 4.1. Comunicação Assíncrona
- **Filas de Mensagens (ex: RabbitMQ, Kafka):** Para comunicação assíncrona entre serviços Rust e Ruby, especialmente para tarefas de longa duração ou eventos.

### 4.2. Extensões Nativas (Magnus)
- Para casos de uso muito específicos onde a performance de uma função Rust é crítica e precisa ser chamada diretamente do Ruby, utilize **Magnus** para criar extensões nativas. Isso deve ser uma exceção, não a regra, para manter o desacoplamento.

## 5. Princípios Gerais de Engenharia de Software

- **Modularidade:** Divida o código em módulos pequenos e coesos, com responsabilidades bem definidas.
- **Testabilidade:** Escreva código que seja fácil de testar em todos os níveis (unidade, integração, ponta a ponta).
- **Manutenibilidade:** Siga padrões de codificação consistentes, documente o código e revise-o regularmente.
- **Escalabilidade:** Projete os serviços para escalar horizontalmente, utilizando conteinerização (Docker) e orquestração (Kubernetes).
- **Observabilidade:** Implemente logging estruturado, métricas (Prometheus) e rastreamento distribuído (OpenTelemetry) para monitorar a saúde e o desempenho da aplicação.
- **DevOps:** Automatize o CI/CD para garantir entregas rápidas e confiáveis.

## 6. Estrutura de Diretórios (Exemplo Sugerido)

```
.antigravyty/
├── backend/ (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── domain/ (Entidades e Casos de Uso)
│   │   ├── application/ (Serviços de aplicação)
│   │   ├── infrastructure/ (Implementações de banco de dados, APIs externas)
│   │   └── presentation/ (Controladores de API)
│   ├── Cargo.toml
│   └── tests/
├── frontend/ (Ruby on Rails)
│   ├── app/
│   │   ├── models/
│   │   ├── views/
│   │   ├── controllers/
│   │   ├── javascript/ (Stimulus controllers)
│   │   └── channels/ (Turbo Streams)
│   ├── config/
│   ├── Gemfile
│   └── spec/
├── shared/ (Protocol Buffers, contratos de API)
├── docker-compose.yml
└── README.md
```

Esta estrutura promove a separação clara entre o backend Rust e o frontend Ruby, facilitando o desenvolvimento independente e a manutenção.

---
**Referências:**
[1] [Deep into Magnus to Write Rust Extension for Ruby](https://blog.aotoki.me/en/posts/2024/08/21/deep-into-magnus-to-write-rust-extension-for-ruby/)
[2] [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[3] [Axum - Web framework for Rust](https://docs.rs/axum/latest/axum/)
[4] [SQLx - The Rust SQL Toolkit](https://github.com/launchbadge/sqlx)
[5] [Ruby on Rails Guides](https://guides.rubyonrails.org/)
[6] [Hotwire - HTML Over The Wire](https://hotwire.dev/)
