use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Task {
    #[serde(default)]
    pub id: i64,
    pub category: String,
    pub activity: String,
    pub responsible: String,
    pub status: String,
    pub priority: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Project {
    #[serde(default)]
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub owner: Option<String>,
    pub deadline: Option<String>,
    pub executive_status: Option<String>,
    pub objective: Option<String>,
    pub scope: Option<String>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Evidence {
    pub id: i64,
    pub task_id: i64,
    pub file_name: String,
    pub file_type: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
}
