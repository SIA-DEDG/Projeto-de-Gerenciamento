//! Testes de integração — requerem DATABASE_URL configurado.
//!
//! Execute com:
//!   cd backend && cargo test -- --include-ignored
//!
//! Ou para rodar só os de integração:
//!   cd backend && cargo test integration -- --include-ignored

use backend::domain::entities::{Project, Task, User};
use backend::domain::ports::{ProjectRepository, TaskRepository, UserRepository};
use backend::infrastructure::repositories::{
    PostgresProjectRepository, PostgresTaskRepository, PostgresUserRepository,
};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

async fn make_pool() -> sqlx::PgPool {
    let _ = dotenvy::dotenv();
    let url = std::env::var("DATABASE_URL")
        .expect("Defina DATABASE_URL no .env para rodar testes de integração");
    PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .expect("Falha ao conectar ao banco de dados")
}

fn unique_name(prefix: &str) -> String {
    format!("{}-{}", prefix, Uuid::new_v4())
}

// ── Task CRUD ─────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requer banco de dados real"]
async fn integration_task_create_read_update_delete() {
    let pool = make_pool().await;
    let repo = PostgresTaskRepository::new(pool);

    let task = Task {
        id: Uuid::nil(),
        category: "Integration".to_string(),
        activity: unique_name("Atividade-Teste"),
        responsible_id: None,
        responsible: String::new(),
        status: "Pendente".to_string(),
        priority: "Alta".to_string(),
        created_at: "2024-06-01".to_string(),
        description: Some("Criada pelo teste de integração".to_string()),
        project_id: None,
        co_responsibles: None,
        external_collaborators: None,
        deadline: None,
        archived: false,
    };
    let created = repo.add_task(task, vec![]).await.unwrap();
    assert!(!created.id.is_nil());
    assert_eq!(created.status, "Pendente");

    // Read by id
    let found = repo.get_task_by_id(created.id).await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().activity, created.activity);

    // Update
    let mut to_update = repo.get_task_by_id(created.id).await.unwrap().unwrap();
    to_update.status = "Concluído".to_string();
    let updated = repo.update_task(to_update, vec![]).await.unwrap();
    assert_eq!(updated.status, "Concluído");

    // Delete
    repo.delete_task(created.id).await.unwrap();
    let gone = repo.get_task_by_id(created.id).await.unwrap();
    assert!(gone.is_none());
}

#[tokio::test]
#[ignore = "requer banco de dados real"]
async fn integration_task_get_all_includes_created() {
    let pool = make_pool().await;
    let repo = PostgresTaskRepository::new(pool);

    let task = Task {
        id: Uuid::nil(),
        category: "Integration".to_string(),
        activity: unique_name("GetAll"),
        responsible_id: None,
        responsible: String::new(),
        status: "Pendente".to_string(),
        priority: "Média".to_string(),
        created_at: "2024-06-01".to_string(),
        description: None,
        project_id: None,
        co_responsibles: None,
        external_collaborators: None,
        deadline: None,
        archived: false,
    };
    let created = repo.add_task(task, vec![]).await.unwrap();
    let all = repo.get_all_tasks().await.unwrap();
    assert!(all.iter().any(|t| t.id == created.id));
    repo.delete_task(created.id).await.unwrap(); // cleanup
}

// ── Project CRUD ──────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requer banco de dados real"]
async fn integration_project_create_read_update_delete() {
    let pool = make_pool().await;
    let repo = PostgresProjectRepository::new(pool);

    let project = Project {
        id: Uuid::nil(),
        name: unique_name("Projeto-Integração"),
        category: Some("TI".to_string()),
        owner_id: None,
        owner: None,
        deadline: Some("2024-12-31".to_string()),
        executive_status: Some("Em andamento".to_string()),
        objective: Some("Testar integração".to_string()),
        scope: None,
        summary: None,
    };
    let created = repo.add_project(project).await.unwrap();
    assert!(!created.id.is_nil());

    // Read
    let found = repo.get_project_by_id(created.id).await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().name, created.name);

    // Update
    let mut to_update = repo.get_project_by_id(created.id).await.unwrap().unwrap();
    to_update.executive_status = Some("Concluído".to_string());
    let updated = repo.update_project(to_update).await.unwrap();
    assert_eq!(updated.executive_status.as_deref(), Some("Concluído"));

    // Delete
    repo.delete_project(created.id).await.unwrap();
    let gone = repo.get_project_by_id(created.id).await.unwrap();
    assert!(gone.is_none());
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requer banco de dados real"]
async fn integration_user_create_and_find() {
    let pool = make_pool().await;
    let repo = PostgresUserRepository::new(pool);

    let username = format!("robo-{}", Uuid::new_v4());
    let user = User {
        id: Uuid::nil(),
        name: "Robô Teste".to_string(),
        username: username.clone(),
        password_hash: "$argon2id$test-hash".to_string(),
        role: "Funcionario".to_string(),
        must_change_password: true,
        created_at: String::new(),
    };

    let created = repo.create(user).await.unwrap();
    assert!(!created.id.is_nil());
    assert_eq!(created.username, username);

    let by_username = repo.find_by_username(&username).await.unwrap();
    assert!(by_username.is_some());
    assert_eq!(by_username.unwrap().id, created.id);

    let by_id = repo.find_by_id(created.id).await.unwrap();
    assert!(by_id.is_some());

    let all = repo.find_all().await.unwrap();
    assert!(all.iter().any(|u| u.id == created.id));
}

// ── Project deadline edge cases ───────────────────────────────────────────────

#[tokio::test]
#[ignore = "requer banco de dados real"]
async fn integration_project_empty_deadline_is_null() {
    let pool = make_pool().await;
    let repo = PostgresProjectRepository::new(pool);

    let project = Project {
        id: Uuid::nil(),
        name: unique_name("Sem-Prazo"),
        category: None,
        owner_id: None,
        owner: None,
        deadline: Some(String::new()),
        executive_status: None,
        objective: None,
        scope: None,
        summary: None,
    };
    let created = repo.add_project(project).await.unwrap();
    assert!(created.deadline.is_none());
    repo.delete_project(created.id).await.unwrap();
}
