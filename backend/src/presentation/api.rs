use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
};
use serde::Deserialize;
use std::sync::Arc;
#[allow(unused_imports)]
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use uuid::Uuid;

use crate::application::auth_use_case::AuthService;
use crate::application::log_use_case::LogService;
use crate::application::use_cases::{AbsenceService, EventService, FeedbackCommentService, FeedbackService, ProjectService, TaskService};
use crate::domain::entities::{Absence, ActivityLog, Event, Feedback, FeedbackComment, Project, Task, UserPublic};
use crate::presentation::auth_extractor::AuthUser;
use crate::presentation::dto::{LoginDto, LoginResponse, RegisterDto, RegisterResponse};

#[derive(Clone)]
pub struct AppState {
    pub task_service: Arc<TaskService>,
    pub project_service: Arc<ProjectService>,
    pub auth_service: Arc<AuthService>,
    pub log_service: Arc<LogService>,
    pub absence_service: Arc<AbsenceService>,
    pub event_service: Arc<EventService>,
    pub feedback_service: Arc<FeedbackService>,
    pub comment_service: Arc<FeedbackCommentService>,
}

pub fn create_router(state: AppState) -> Router {
    // let auth_limiter = Arc::new(
    //     GovernorConfigBuilder::default()
    //         .per_second(1)
    //         .burst_size(5)
    //         .finish()
    //         .unwrap(),
    // );

    // let api_limiter = Arc::new(
    //     GovernorConfigBuilder::default()
    //         .per_second(50)
    //         .burst_size(100)
    //         .finish()
    //         .unwrap(),
    // );

    let auth_routes = Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/change-password", put(change_password_handler))
        .route("/api/auth/set-initial-password", put(set_initial_password_handler))
        // .layer(GovernorLayer::new(Arc::clone(&auth_limiter)))
        ;

    let api_routes = Router::new()
        .route("/api/users", get(get_users_handler))
        .route("/api/users/me", put(update_profile_handler))
        .route("/api/users/{id}", delete(delete_user_handler))
        .route("/api/users/{id}/role", put(update_user_role_handler))
        .route("/api/users/{id}/password", put(admin_reset_password_handler))
        .route("/api/tasks", get(get_tasks_handler).post(create_task_handler))
        .route("/api/tasks/batch", post(create_tasks_batch_handler))
        .route("/api/tasks/archived", get(get_archived_tasks_handler))
        .route("/api/tasks/{id}", get(get_task_handler).put(update_task_handler).delete(delete_task_handler))
        .route("/api/tasks/{id}/archive", put(archive_task_handler))
        .route("/api/tasks/{id}/unarchive", put(unarchive_task_handler))
        .route("/api/projects", get(get_projects_handler).post(create_project_handler))
        .route("/api/projects/{id}", get(get_project_handler).put(update_project_handler).delete(delete_project_handler))
        .route("/api/logs", get(get_logs_handler).delete(clear_logs_handler))
        .route("/api/absences", get(get_absences_handler).post(create_absence_handler))
        .route("/api/absences/{id}", put(update_absence_handler).delete(delete_absence_handler))
        .route("/api/absences/{id}/approval", put(approve_absence_handler))
        .route("/api/events", get(get_events_handler).post(create_event_handler))
        .route("/api/events/{id}", put(update_event_handler).delete(delete_event_handler))
        .route("/api/events/{id}/minutes", put(set_event_minutes_handler).delete(remove_event_minutes_handler))
        .route("/api/feedback", get(get_feedbacks_handler).post(create_feedback_handler))
        .route("/api/feedback/{id}", put(update_feedback_handler).delete(delete_feedback_handler))
        .route("/api/feedback/{id}/upvote", post(upvote_feedback_handler))
        .route("/api/feedback/{id}/status", put(set_status_handler))
        .route("/api/feedback/{id}/resposta", put(set_resposta_handler))
        .route("/api/feedback/{id}/comments", get(get_comments_handler).post(add_comment_handler))
        .route("/api/feedback/{id}/comments/{cid}", delete(delete_comment_handler))
        // .layer(GovernorLayer::new(Arc::clone(&api_limiter)))
        ;

    Router::new()
        .merge(auth_routes)
        .merge(api_routes)
        .with_state(state)
}

fn parse_uid(user_id_str: &str) -> Uuid {
    Uuid::parse_str(user_id_str).unwrap_or(Uuid::nil())
}
#[derive(Deserialize)]
struct TaskInputDto {
    category: String,
    activity: String,
    description: Option<String>,
    responsible_id: Option<Uuid>,
    status: String,
    priority: Option<String>,
    created_at: Option<String>,
    project_id: Option<Uuid>,
    co_responsible_ids: Option<Vec<Uuid>>,
    external_collaborators: Option<String>,
    deadline: Option<String>,
}

#[derive(Deserialize)]
struct ProjectInputDto {
    name: String,
    category: Option<String>,
    owner_id: Option<Uuid>,
    deadline: Option<String>,
    executive_status: Option<String>,
    objective: Option<String>,
    scope: Option<String>,
    summary: Option<String>,
}

#[derive(Deserialize)]
struct AbsenceInputDto {
    user_id: Option<Uuid>,
    reason: String,
    justification: Option<String>,
    file_name: Option<String>,
    file_data: Option<String>,
    start_date: String,
    end_date: String,
}

#[derive(Deserialize)]
struct AbsenceUpdateDto {
    reason: String,
    justification: Option<String>,
    start_date: String,
    end_date: String,
}

#[derive(Deserialize)]
struct AbsenceApprovalDto {
    approval_status: String,
}

#[derive(Deserialize)]
struct EventMinutesDto {
    file_name: String,
    file_data: String,
}

#[derive(Deserialize)]
struct EventInputDto {
    name: String,
    responsible_ids: Option<Vec<Uuid>>,
    event_type: String,
    attendees: Option<String>,
    start_date: String,
    end_date: String,
    start_time: Option<String>,
}

#[derive(Deserialize)]
struct FeedbackInputDto {
    tipo: String,
    titulo: String,
    descricao: String,
    severidade: Option<String>,
    usuario_nome: Option<String>,
    imagens: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct UpdateFeedbackDto {
    tipo: String,
    titulo: String,
    descricao: String,
    severidade: Option<String>,
    imagens: Option<serde_json::Value>,
}


async fn login_handler(
    State(state): State<AppState>,
    Json(dto): Json<LoginDto>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    state
        .auth_service
        .login(&dto.username, &dto.password)
        .await
        .map(
            |(user_id, token, name, role, username, must_change_password)| {
                Json(LoginResponse {
                    token,
                    user_id,
                    name,
                    role,
                    username,
                    must_change_password,
                })
            },
        )
        .map_err(|e| (StatusCode::UNAUTHORIZED, e))
}

async fn register_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<RegisterDto>,
) -> Result<(StatusCode, Json<RegisterResponse>), (StatusCode, String)> {
    let registered_name = dto.name.clone();
    let registered_username = dto.username.clone();

    let (user_id, name, role, temp_password) = state
        .auth_service
        .register(dto.name, dto.username, dto.role)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "user",
            &registered_username,
            &format!("Registrou usuário '{}'", registered_name),
        )
        .await;

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            user_id,
            name,
            role,
            temp_password,
        }),
    ))
}

#[derive(Deserialize)]
struct ChangePasswordDto {
    current_password: String,
    new_password: String,
}

async fn change_password_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<ChangePasswordDto>,
) -> Result<StatusCode, (StatusCode, String)> {
    let uid = parse_uid(&auth.0.sub);
    state
        .auth_service
        .change_password(uid, &dto.current_password, &dto.new_password)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let _ = state
        .log_service
        .add(
            uid,
            &auth.0.username,
            "UPDATE",
            "user",
            &uid.to_string(),
            "Alterou a própria senha",
        )
        .await;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct SetInitialPasswordDto {
    new_password: String,
}

async fn set_initial_password_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<SetInitialPasswordDto>,
) -> Result<StatusCode, (StatusCode, String)> {
    let uid = parse_uid(&auth.0.sub);
    state
        .auth_service
        .set_initial_password(uid, &dto.new_password)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let _ = state
        .log_service
        .add(
            uid,
            &auth.0.username,
            "UPDATE",
            "user",
            &uid.to_string(),
            "Definiu senha no primeiro acesso",
        )
        .await;
    Ok(StatusCode::NO_CONTENT)
}


#[derive(Deserialize)]
struct UpdateProfileDto {
    name: String,
}

async fn update_profile_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<UpdateProfileDto>,
) -> Result<StatusCode, (StatusCode, String)> {
    let uid = parse_uid(&auth.0.sub);
    state
        .auth_service
        .update_name(uid, dto.name.clone())
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let _ = state
        .log_service
        .add(
            uid,
            &auth.0.username,
            "UPDATE",
            "user",
            &uid.to_string(),
            &format!("Atualizou nome para '{}'", dto.name),
        )
        .await;
    Ok(StatusCode::NO_CONTENT)
}

async fn get_users_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<UserPublic>>, StatusCode> {
    state
        .auth_service
        .list_users()
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}


async fn get_tasks_handler(_auth: AuthUser, State(state): State<AppState>) -> Json<Vec<Task>> {
    match state.task_service.fetch_all_tasks().await {
        Ok(tasks) => Json(tasks),
        Err(_) => Json(vec![]),
    }
}

async fn create_task_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<TaskInputDto>,
) -> Result<(StatusCode, Json<Task>), StatusCode> {
    let task = Task {
        id: Uuid::new_v4(),
        category: dto.category,
        activity: dto.activity,
        description: dto.description,
        responsible_id: dto.responsible_id,
        responsible: String::new(),
        status: dto.status,
        priority: dto.priority.unwrap_or_else(|| "Média".to_string()),
        created_at: dto.created_at.unwrap_or_default(),
        project_id: dto.project_id,
        co_responsibles: None,
        external_collaborators: dto.external_collaborators,
        deadline: dto.deadline,
        archived: false,
    };
    let co_ids = dto.co_responsible_ids.unwrap_or_default();
    let created = state
        .task_service
        .create_task(task, co_ids)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "task",
            &created.id.to_string(),
            &format!("Criou atividade '{}'", created.activity),
        )
        .await;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn create_tasks_batch_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dtos): Json<Vec<TaskInputDto>>,
) -> Result<(StatusCode, Json<Vec<Task>>), StatusCode> {
    let count = dtos.len();
    let (tasks, co_ids): (Vec<Task>, Vec<Vec<Uuid>>) = dtos
        .into_iter()
        .map(|dto| {
            let ids = dto.co_responsible_ids.unwrap_or_default();
            let task = Task {
                id: Uuid::new_v4(),
                category: dto.category,
                activity: dto.activity,
                description: dto.description,
                responsible_id: dto.responsible_id,
                responsible: String::new(),
                status: dto.status,
                priority: dto.priority.unwrap_or_else(|| "Média".to_string()),
                created_at: dto.created_at.unwrap_or_default(),
                project_id: dto.project_id,
                co_responsibles: None,
                external_collaborators: dto.external_collaborators,
                deadline: dto.deadline,
                archived: false,
            };
            (task, ids)
        })
        .unzip();
    let created = state
        .task_service
        .create_tasks_batch(tasks, co_ids)
        .await
        .map_err(|e| { eprintln!("[BATCH ERROR] {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "task",
            "batch",
            &format!("Importou {} atividades via planilha", count),
        )
        .await;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn get_task_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>, StatusCode> {
    match state.task_service.get_task(id).await {
        Ok(Some(task)) => Ok(Json(task)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn update_task_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<TaskInputDto>,
) -> Result<Json<Task>, StatusCode> {
    let task = Task {
        id,
        category: dto.category,
        activity: dto.activity,
        description: dto.description,
        responsible_id: dto.responsible_id,
        responsible: String::new(),
        status: dto.status,
        priority: dto.priority.unwrap_or_else(|| "Média".to_string()),
        created_at: dto.created_at.unwrap_or_default(),
        project_id: dto.project_id,
        co_responsibles: None,
        external_collaborators: dto.external_collaborators,
        deadline: dto.deadline,
        archived: false,
    };
    let co_ids = dto.co_responsible_ids.unwrap_or_default();
    let updated = state
        .task_service
        .update_task(task, co_ids)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "task",
            &updated.id.to_string(),
            &format!("Atualizou atividade '{}'", updated.activity),
        )
        .await;
    Ok(Json(updated))
}

async fn delete_task_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match state.task_service.delete_task(id).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "DELETE",
                    "task",
                    &id.to_string(),
                    "Excluiu atividade",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(_) => StatusCode::NOT_FOUND,
    }
}

async fn get_archived_tasks_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
) -> Json<Vec<Task>> {
    match state.task_service.fetch_archived_tasks().await {
        Ok(tasks) => Json(tasks),
        Err(_) => Json(vec![]),
    }
}

async fn archive_task_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match state.task_service.set_task_archived(id, true).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "ARCHIVE",
                    "task",
                    &id.to_string(),
                    "Arquivou atividade",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(_) => StatusCode::NOT_FOUND,
    }
}

async fn unarchive_task_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match state.task_service.set_task_archived(id, false).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "UNARCHIVE",
                    "task",
                    &id.to_string(),
                    "Restaurou atividade",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(_) => StatusCode::NOT_FOUND,
    }
}


async fn get_projects_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
) -> Json<Vec<Project>> {
    match state.project_service.fetch_all_projects().await {
        Ok(projects) => Json(projects),
        Err(_) => Json(vec![]),
    }
}

async fn create_project_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<ProjectInputDto>,
) -> Result<(StatusCode, Json<Project>), (StatusCode, String)> {
    let project = Project {
        id: Uuid::new_v4(),
        name: dto.name,
        category: dto.category,
        owner_id: dto.owner_id,
        owner: None,
        deadline: dto.deadline,
        executive_status: dto.executive_status,
        objective: dto.objective,
        scope: dto.scope,
        summary: dto.summary,
    };
    let created = state
        .project_service
        .create_project(project)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "project",
            &created.id.to_string(),
            &format!("Criou projeto '{}'", created.name),
        )
        .await;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn get_project_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Project>, StatusCode> {
    match state.project_service.get_project(id).await {
        Ok(Some(project)) => Ok(Json(project)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn update_project_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<ProjectInputDto>,
) -> Result<Json<Project>, StatusCode> {
    let project = Project {
        id,
        name: dto.name,
        category: dto.category,
        owner_id: dto.owner_id,
        owner: None,
        deadline: dto.deadline,
        executive_status: dto.executive_status,
        objective: dto.objective,
        scope: dto.scope,
        summary: dto.summary,
    };
    let updated = state
        .project_service
        .update_project(project)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "project",
            &updated.id.to_string(),
            &format!("Atualizou projeto '{}'", updated.name),
        )
        .await;
    Ok(Json(updated))
}

async fn delete_project_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match state.project_service.delete_project(id).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "DELETE",
                    "project",
                    &id.to_string(),
                    "Excluiu projeto",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(_) => StatusCode::NOT_FOUND,
    }
}


async fn delete_user_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    if !ROLES_CAN_MANAGE_USERS.contains(&auth.0.role.as_str()) {
        return StatusCode::FORBIDDEN;
    }
    if auth.0.sub == id.to_string() {
        return StatusCode::FORBIDDEN;
    }
    if auth.0.role != "Admin" {
        let all_users = state.auth_service.list_users().await.unwrap_or_default();
        if let Some(target) = all_users.iter().find(|u| u.id == id) {
            if target.role == "Admin" {
                return StatusCode::FORBIDDEN;
            }
        }
    }
    match state.auth_service.delete_user(id).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "DELETE",
                    "user",
                    &id.to_string(),
                    "Excluiu usuário",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(e) if e.contains("não encontrado") => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

#[derive(Deserialize)]
struct UpdateRoleDto {
    role: String,
}

async fn update_user_role_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateRoleDto>,
) -> StatusCode {
    if !ROLES_CAN_MANAGE_USERS.contains(&auth.0.role.as_str()) {
        return StatusCode::FORBIDDEN;
    }
    if auth.0.role != "Admin" {
        if dto.role == "Admin" {
            return StatusCode::FORBIDDEN;
        }
        let all_users = state.auth_service.list_users().await.unwrap_or_default();
        if let Some(target) = all_users.iter().find(|u| u.id == id) {
            if target.role == "Admin" {
                return StatusCode::FORBIDDEN;
            }
        }
    }
    match state.auth_service.update_role(id, dto.role.clone()).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "UPDATE",
                    "user",
                    &id.to_string(),
                    &format!("Alterou role para '{}'", dto.role),
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(_) => StatusCode::NOT_FOUND,
    }
}

#[derive(Deserialize)]
struct AdminResetPasswordDto {
    new_password: String,
}

async fn admin_reset_password_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<AdminResetPasswordDto>,
) -> impl IntoResponse {
    if auth.0.role != "Admin" {
        return (StatusCode::FORBIDDEN, "Acesso negado".to_string());
    }
    if auth.0.sub == id.to_string() {
        return (
            StatusCode::BAD_REQUEST,
            "Use a tela de configurações para alterar sua própria senha".to_string(),
        );
    }
    match state
        .auth_service
        .admin_reset_password(id, &dto.new_password)
        .await
    {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "UPDATE",
                    "user",
                    &id.to_string(),
                    "Admin redefiniu senha do usuário",
                )
                .await;
            (StatusCode::NO_CONTENT, String::new())
        }
        Err(e) => (StatusCode::BAD_REQUEST, e),
    }
}


async fn get_logs_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
) -> Json<Vec<ActivityLog>> {
    match state.log_service.get_all().await {
        Ok(logs) => Json(logs),
        Err(_) => Json(vec![]),
    }
}

async fn clear_logs_handler(auth: AuthUser, State(state): State<AppState>) -> StatusCode {
    if auth.0.role != "Admin" {
        return StatusCode::FORBIDDEN;
    }
    match state.log_service.clear_all().await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "DELETE",
                    "log",
                    "all",
                    "Admin limpou todos os logs",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}


const ROLES_SEE_ALL_ABSENCES: &[&str] = &["Admin", "Diretor", "Gerente"];
const ROLES_CAN_MANAGE_USERS: &[&str] = &["Admin", "Diretor", "Gerente"];

async fn get_absences_handler(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Json<Vec<Absence>> {
    match state.absence_service.get_all().await {
        Ok(absences) => {
            if ROLES_SEE_ALL_ABSENCES.contains(&auth.0.role.as_str()) {
                Json(absences)
            } else {
                let user_id = Uuid::parse_str(&auth.0.sub).ok();
                Json(absences.into_iter().filter(|a| a.user_id == user_id).collect())
            }
        }
        Err(_) => Json(vec![]),
    }
}

async fn create_absence_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<AbsenceInputDto>,
) -> Result<(StatusCode, Json<Absence>), (StatusCode, String)> {
    let absence = Absence {
        id: Uuid::new_v4(),
        user_id: dto.user_id,
        employee_name: String::new(),
        reason: dto.reason,
        justification: dto.justification,
        file_name: dto.file_name,
        file_data: dto.file_data,
        start_date: dto.start_date,
        end_date: dto.end_date,
        approval_status: "pendente".to_string(),
        created_at: String::new(),
    };
    let created = state
        .absence_service
        .add(absence)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "absence",
            &created.id.to_string(),
            &format!("Registrou falta de '{}'", created.employee_name),
        )
        .await;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn update_absence_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<AbsenceUpdateDto>,
) -> Result<Json<Absence>, (StatusCode, String)> {
    let updated = state
        .absence_service
        .update(id, dto.reason, dto.justification, dto.start_date, dto.end_date)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "absence",
            &id.to_string(),
            "Atualizou justificativa de falta",
        )
        .await;
    Ok(Json(updated))
}

async fn delete_absence_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match state.absence_service.delete(id).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "DELETE",
                    "absence",
                    &id.to_string(),
                    "Excluiu justificativa de falta",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(e) if e.contains("não encontrada") => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn approve_absence_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<AbsenceApprovalDto>,
) -> Result<Json<Absence>, (StatusCode, String)> {
    let updated = state
        .absence_service
        .set_approval_status(id, dto.approval_status.clone())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "absence",
            &id.to_string(),
            &format!("Alterou aprovação de falta para '{}'", dto.approval_status),
        )
        .await;
    Ok(Json(updated))
}

async fn get_events_handler(_auth: AuthUser, State(state): State<AppState>) -> Json<Vec<Event>> {
    match state.event_service.get_all().await {
        Ok(events) => Json(events),
        Err(_) => Json(vec![]),
    }
}

async fn create_event_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<EventInputDto>,
) -> Result<(StatusCode, Json<Event>), (StatusCode, String)> {
    let event = Event {
        id: Uuid::new_v4(),
        name: dto.name,
        responsibles: String::new(),
        event_type: dto.event_type,
        attendees: dto.attendees,
        start_date: dto.start_date,
        end_date: dto.end_date,
        start_time: dto.start_time,
        minutes_file_name: None,
        minutes_file_data: None,
        created_at: String::new(),
    };
    let responsible_ids = dto.responsible_ids.unwrap_or_default();
    let created = state
        .event_service
        .add(event, responsible_ids)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "event",
            &created.id.to_string(),
            &format!("Criou evento '{}'", created.name),
        )
        .await;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn update_event_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<EventInputDto>,
) -> Result<Json<Event>, StatusCode> {
    let event = Event {
        id,
        name: dto.name,
        responsibles: String::new(),
        event_type: dto.event_type,
        attendees: dto.attendees,
        start_date: dto.start_date,
        end_date: dto.end_date,
        start_time: dto.start_time,
        minutes_file_name: None,
        minutes_file_data: None,
        created_at: String::new(),
    };
    let responsible_ids = dto.responsible_ids.unwrap_or_default();
    let updated = state
        .event_service
        .update(event, responsible_ids)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "event",
            &updated.id.to_string(),
            &format!("Atualizou evento '{}'", updated.name),
        )
        .await;
    Ok(Json(updated))
}

async fn delete_event_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match state.event_service.delete(id).await {
        Ok(_) => {
            let _ = state
                .log_service
                .add(
                    parse_uid(&auth.0.sub),
                    &auth.0.username,
                    "DELETE",
                    "event",
                    &id.to_string(),
                    "Excluiu evento",
                )
                .await;
            StatusCode::NO_CONTENT
        }
        Err(e) if e.contains("não encontrado") => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn set_event_minutes_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<EventMinutesDto>,
) -> Result<Json<Event>, (StatusCode, String)> {
    let updated = state
        .event_service
        .set_minutes(id, Some(dto.file_name.clone()), Some(dto.file_data))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "event",
            &id.to_string(),
            &format!("Anexou ata '{}' ao evento", dto.file_name),
        )
        .await;
    Ok(Json(updated))
}

async fn remove_event_minutes_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Event>, (StatusCode, String)> {
    let updated = state
        .event_service
        .set_minutes(id, None, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "UPDATE",
            "event",
            &id.to_string(),
            "Removeu ata do evento",
        )
        .await;
    Ok(Json(updated))
}

async fn get_feedbacks_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
) -> Json<Vec<Feedback>> {
    match state.feedback_service.get_all().await {
        Ok(feedbacks) => Json(feedbacks),
        Err(_) => Json(vec![]),
    }
}

async fn create_feedback_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(dto): Json<FeedbackInputDto>,
) -> Result<(StatusCode, Json<Feedback>), (StatusCode, String)> {
    let imagens_json = dto.imagens.map(|v| v.to_string());
    let feedback = Feedback {
        id: Uuid::new_v4(),
        tipo: dto.tipo,
        titulo: dto.titulo.clone(),
        descricao: dto.descricao,
        severidade: dto.severidade,
        usuario_id: Some(parse_uid(&auth.0.sub)),
        usuario_nome: dto.usuario_nome,
        imagens: imagens_json,
        resposta: None,
        status: "pendente".to_string(),
        upvotes: 0,
        upvoted_by: "[]".to_string(),
        comment_count: 0,
        created_at: String::new(),
    };
    let created = state
        .feedback_service
        .add(feedback)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let _ = state
        .log_service
        .add(
            parse_uid(&auth.0.sub),
            &auth.0.username,
            "CREATE",
            "feedback",
            &created.id.to_string(),
            &format!("Enviou feedback [{}]: '{}'", created.tipo, created.titulo),
        )
        .await;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn upvote_feedback_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Feedback>, (StatusCode, String)> {
    state
        .feedback_service
        .toggle_upvote(id, auth.0.sub)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct RespostaDto {
    resposta: Option<String>,
}

#[derive(Deserialize)]
struct StatusDto {
    status: String,
}

async fn update_feedback_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateFeedbackDto>,
) -> Result<Json<Feedback>, (StatusCode, String)> {
    let imagens_json = dto.imagens.map(|v| v.to_string());
    state
        .feedback_service
        .update_feedback(id, dto.tipo, dto.titulo, dto.descricao, dto.severidade, imagens_json)
        .await
        .map(Json)
        .map_err(|e| {
            if e.contains("no rows") {
                (StatusCode::NOT_FOUND, "Feedback não encontrado".to_string())
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, e)
            }
        })
}

async fn delete_feedback_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let caller_id = if auth.0.role == "Admin" { None } else { Some(parse_uid(&auth.0.sub)) };
    state
        .feedback_service
        .delete(id, caller_id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|e| {
            if e == "forbidden" {
                (StatusCode::FORBIDDEN, "Sem permissão para excluir este feedback".to_string())
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, e)
            }
        })
}

async fn set_status_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<StatusDto>,
) -> Result<Json<Feedback>, (StatusCode, String)> {
    if auth.0.role != "Admin" {
        return Err((StatusCode::FORBIDDEN, "Apenas admins podem alterar o status".to_string()));
    }
    if dto.status != "pendente" && dto.status != "respondida" {
        return Err((StatusCode::BAD_REQUEST, "Status inválido".to_string()));
    }
    state
        .feedback_service
        .set_status(id, dto.status)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn set_resposta_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(dto): Json<RespostaDto>,
) -> Result<Json<Feedback>, (StatusCode, String)> {
    if auth.0.role != "Admin" {
        return Err((StatusCode::FORBIDDEN, "Apenas admins podem responder feedbacks".to_string()));
    }
    state
        .feedback_service
        .set_resposta(id, dto.resposta)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}


#[derive(Deserialize)]
struct CommentInputDto {
    conteudo: String,
    parent_id: Option<Uuid>,
    usuario_nome: Option<String>,
}

async fn get_comments_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
    Path(feedback_id): Path<Uuid>,
) -> impl IntoResponse {
    match state.comment_service.get_by_feedback(feedback_id).await {
        Ok(comments) => (StatusCode::OK, Json(comments)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn add_comment_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(feedback_id): Path<Uuid>,
    Json(dto): Json<CommentInputDto>,
) -> impl IntoResponse {
    let nome = dto.usuario_nome.unwrap_or_else(|| auth.0.username.clone());
    let comment = FeedbackComment {
        id: Uuid::new_v4(),
        feedback_id,
        parent_id: dto.parent_id,
        usuario_id: Some(parse_uid(&auth.0.sub)),
        usuario_nome: nome,
        conteudo: dto.conteudo,
        created_at: String::new(),
    };
    match state.comment_service.add(comment).await {
        Ok(c) => (StatusCode::CREATED, Json(c)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn delete_comment_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Path((_feedback_id, comment_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let caller_id = if auth.0.role == "Admin" { None } else { Some(parse_uid(&auth.0.sub)) };
    match state.comment_service.delete(comment_id, caller_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::FORBIDDEN, e).into_response(),
    }
}
