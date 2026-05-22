use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use backend::application::auth_use_case::AuthService;
use backend::application::log_use_case::LogService;
use backend::application::use_cases::{AbsenceService, EventService, ProjectService, TaskService};
use backend::infrastructure::repositories::{
    PostgresAbsenceRepository, PostgresActivityLogRepository, PostgresEventRepository,
    PostgresProjectRepository, PostgresTaskRepository, PostgresUserRepository,
};
use backend::presentation::api::{AppState, create_router};

#[tokio::main]
async fn main() {
    let _ = dotenv();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL não definido no .env");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Falha ao conectar no banco de dados");

    println!("Backend conectado ao Postgres. Executando migrations...");

    match sqlx::migrate!("./migrations").run(&pool).await {
        Ok(_) => println!("Migrations aplicadas com sucesso."),
        Err(e) => eprintln!("Aviso ao executar migrations: {}", e),
    }

    let auth_service = Arc::new(AuthService::new(Arc::new(PostgresUserRepository::new(
        pool.clone(),
    ))));

    let admin_username = env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
    let admin_password = env::var("ADMIN_PASSWORD").expect("ADMIN_PASSWORD não definido no .env");
    match auth_service
        .register_admin(
            "Administrador".to_string(),
            admin_username.clone(),
            admin_password,
            "Admin".to_string(),
        )
        .await
    {
        Ok(_) => println!("Conta Admin criada → usuário: {}", admin_username),
        Err(e) if e.contains("Usuário já registrado") => {
            println!("Admin já existe — seed ignorado.")
        }
        Err(e) => eprintln!("Erro ao criar conta Admin: {}", e),
    }

    let task_repo = PostgresTaskRepository::new(pool.clone());
    let project_repo = PostgresProjectRepository::new(pool.clone());
    let log_repo = PostgresActivityLogRepository::new(pool.clone());
    let absence_repo = PostgresAbsenceRepository::new(pool.clone());
    let event_repo = PostgresEventRepository::new(pool.clone());

    let task_service = Arc::new(TaskService::new(Arc::new(task_repo)));
    let project_service = Arc::new(ProjectService::new(Arc::new(project_repo)));
    let log_service = Arc::new(LogService::new(Arc::new(log_repo)));
    let absence_service = Arc::new(AbsenceService::new(Arc::new(absence_repo)));
    let event_service = Arc::new(EventService::new(Arc::new(event_repo)));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = create_router(AppState {
        task_service,
        project_service,
        auth_service,
        log_service,
        absence_service,
        event_service,
    })
    .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap();
    println!("Backend rodando em http://localhost:{}", port);
    // axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
    axum::serve(listener, app)
        .await
        .unwrap();
}
