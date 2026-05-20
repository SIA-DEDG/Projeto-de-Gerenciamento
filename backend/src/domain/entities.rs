use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Task {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub category: String,
    pub activity: String,
    pub responsible_id: Option<Uuid>,
    // nome resolvido via JOIN — somente leitura
    #[serde(default)]
    pub responsible: String,
    pub status: String,
    pub priority: String,
    pub created_at: String,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    // JSON de nomes agregados via JOIN task_co_responsibles
    pub co_responsibles: Option<String>,
    pub external_collaborators: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Project {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub owner_id: Option<Uuid>,
    // nome resolvido via JOIN — somente leitura
    #[serde(default)]
    pub owner: Option<String>,
    pub deadline: Option<String>,
    pub executive_status: Option<String>,
    pub objective: Option<String>,
    pub scope: Option<String>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub must_change_password: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Evidence {
    pub id: Uuid,
    pub task_id: Uuid,
    pub file_name: String,
    pub file_type: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
}

// projeção pública de User sem password_hash
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserPublic {
    pub id: Uuid,
    pub name: String,
    pub username: String,
    pub role: String,
    pub must_change_password: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Absence {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    // nome resolvido via JOIN — somente leitura
    #[serde(default)]
    pub employee_name: String,
    pub reason: String,
    pub justification: Option<String>,
    pub file_name: Option<String>,
    pub file_data: Option<String>,
    pub start_date: String,
    pub end_date: String,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Event {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub name: String,
    // JSON de nomes agregados via JOIN event_responsibles
    #[serde(default)]
    pub responsibles: String,
    pub event_type: String,
    pub attendees: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub start_time: Option<String>,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActivityLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub action: String,
    pub entity_type: String,
    pub entity_id: String,
    pub details: String,
    pub created_at: String,
}
