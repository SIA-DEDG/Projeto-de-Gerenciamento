pub mod domain;
pub mod application;
pub mod infrastructure;
pub mod presentation;

use tower_http::cors::{Any, CorsLayer};
use std::sync::Arc;

use application::use_cases::TaskService;
use infrastructure::repositories::InMemoryTaskRepository;
use presentation::api::{create_router, AppState};

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 1. Iniciar repositórios (Infrastructure)
    let task_repository = Arc::new(InMemoryTaskRepository::new());

    // 2. Iniciar casos de uso (Application)
    let task_service = Arc::new(TaskService::new(task_repository));

    // 3. Montar o estado do App
    let app_state = AppState { task_service };

    // 4. Configurar Rotas (Presentation)
    let app = create_router(app_state).layer(cors);

    // 5. Iniciar o servidor TCP
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Backend Rust (Clean Architecture) rodando em http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
