pub mod domain;
pub mod application;
pub mod infrastructure;
pub mod presentation;

use dotenvy::dotenv;
use std::env;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use application::use_cases::TaskService;
use infrastructure::repositories::{InMemoryTaskRepository, PostgresTaskRepository};
use presentation::api::{create_router, AppState};

#[tokio::main]
async fn main() {
    let _ = dotenv();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let task_repository: Arc<dyn domain::ports::TaskRepository> =
        if let Ok(database_url) = env::var("DATABASE_URL") {
            match PostgresTaskRepository::new(&database_url).await {
                Ok(repo) => {
                    println!("Backend conectado ao Postgres/Supabase.");
                    Arc::new(repo)
                }
                Err(err) => {
                    println!(
                        "Falha ao conectar no Postgres/Supabase: {}. Usando repositório em memória.",
                        err
                    );
                    Arc::new(InMemoryTaskRepository::new())
                }
            }
        } else {
            println!("DATABASE_URL não definido. Usando repositório em memória.");
            Arc::new(InMemoryTaskRepository::new())
        };

    let task_service = Arc::new(TaskService::new(task_repository));
    let app_state = AppState { task_service };
    let app = create_router(app_state).layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let bind_addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&bind_addr).await.unwrap();
    println!("Backend Rust rodando em http://localhost:{}", port);
    axum::serve(listener, app).await.unwrap();
}
