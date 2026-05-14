use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use std::sync::Arc;

use crate::application::use_cases::{TaskService, ProjectService};
use crate::domain::entities::{Task, Project};

#[derive(Clone)]
pub struct AppState {
    pub task_service: Arc<TaskService>,
    pub project_service: Arc<ProjectService>,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/tasks", get(get_tasks_handler))
        .route("/api/tasks", post(create_task_handler))
        .route("/api/tasks/:id", get(get_task_handler))
        .route("/api/tasks/:id", put(update_task_handler))
        .route("/api/tasks/:id", delete(delete_task_handler))
        .route("/api/projects", get(get_projects_handler))
        .route("/api/projects", post(create_project_handler))
        .route("/api/projects/:id", get(get_project_handler))
        .route("/api/projects/:id", put(update_project_handler))
        .route("/api/projects/:id", delete(delete_project_handler))
        .with_state(state)
}

/// GET /api/tasks — Lista todas as tarefas
async fn get_tasks_handler(State(state): State<AppState>) -> Json<Vec<Task>> {
    match state.task_service.fetch_all_tasks().await {
        Ok(tasks) => Json(tasks),
        Err(_) => Json(vec![]),
    }
}

/// POST /api/tasks — Cria uma nova tarefa
async fn create_task_handler(
    State(state): State<AppState>,
    Json(task): Json<Task>,
) -> (StatusCode, Json<Task>) {
    match state.task_service.create_task(task).await {
        Ok(created) => (StatusCode::CREATED, Json(created)),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(Task {
            id: 0,
            category: String::new(),
            activity: "Erro ao criar task".to_string(),
            responsible: String::new(),
            status: String::new(),
            priority: String::new(),
            created_at: String::new(),
        })),
    }
}

/// GET /api/tasks/:id — Busca uma tarefa específica
async fn get_task_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Task>, StatusCode> {
    match state.task_service.get_task(id).await {
        Ok(Some(task)) => Ok(Json(task)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// PUT /api/tasks/:id — Atualiza uma tarefa
async fn update_task_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(mut task): Json<Task>,
) -> Result<Json<Task>, StatusCode> {
    task.id = id;
    match state.task_service.update_task(task).await {
        Ok(updated) => Ok(Json(updated)),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

/// DELETE /api/tasks/:id — Remove uma tarefa
async fn delete_task_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> StatusCode {
    match state.task_service.delete_task(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::NOT_FOUND,
    }
}

// ─── Handlers de Projetos ─────────────────────────────────────────────────────

/// GET /api/projects — Lista todos os projetos
async fn get_projects_handler(State(state): State<AppState>) -> Json<Vec<Project>> {
    match state.project_service.fetch_all_projects().await {
        Ok(projects) => Json(projects),
        Err(_) => Json(vec![]),
    }
}

/// POST /api/projects — Cria um novo projeto
async fn create_project_handler(
    State(state): State<AppState>,
    Json(project): Json<Project>,
) -> (StatusCode, Json<Project>) {
    match state.project_service.create_project(project).await {
        Ok(created) => (StatusCode::CREATED, Json(created)),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(Project {
            id: 0,
            name: "Erro ao criar projeto".to_string(),
            category: None,
            owner: None,
            deadline: None,
            executive_status: None,
            objective: None,
            scope: None,
            summary: None,
        })),
    }
}

/// GET /api/projects/:id — Busca um projeto específico
async fn get_project_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Project>, StatusCode> {
    match state.project_service.get_project(id).await {
        Ok(Some(project)) => Ok(Json(project)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// PUT /api/projects/:id — Atualiza um projeto
async fn update_project_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(mut project): Json<Project>,
) -> Result<Json<Project>, StatusCode> {
    project.id = id;
    match state.project_service.update_project(project).await {
        Ok(updated) => Ok(Json(updated)),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

/// DELETE /api/projects/:id — Remove um projeto
async fn delete_project_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> StatusCode {
    match state.project_service.delete_project(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::NOT_FOUND,
    }
}
