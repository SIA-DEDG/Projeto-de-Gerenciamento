use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: u32,
    pub category: String,
    pub activity: String,
    pub responsible: String,
    pub status: String,
    pub priority: String,
    pub created_at: String,
}
