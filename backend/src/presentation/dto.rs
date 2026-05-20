use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct RegisterDto {
    pub name: String,
    pub username: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct LoginDto {
    #[serde(alias = "email")]
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: Uuid,
    pub name: String,
    pub role: String,
    pub username: String,
    pub must_change_password: bool,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    pub user_id: Uuid,
    pub name: String,
    pub role: String,
    pub temp_password: String,
}
