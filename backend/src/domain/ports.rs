use super::entities::{Task, Project};
use async_trait::async_trait;

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn get_all_tasks(&self) -> Result<Vec<Task>, String>;
    async fn add_task(&self, task: Task) -> Result<Task, String>;
    async fn get_task_by_id(&self, id: i64) -> Result<Option<Task>, String>;
    async fn update_task(&self, task: Task) -> Result<Task, String>;
    async fn delete_task(&self, id: i64) -> Result<(), String>;
}

#[async_trait]
pub trait ProjectRepository: Send + Sync {
    async fn get_all_projects(&self) -> Result<Vec<Project>, String>;
    async fn add_project(&self, project: Project) -> Result<Project, String>;
    async fn get_project_by_id(&self, id: i64) -> Result<Option<Project>, String>;
    async fn update_project(&self, project: Project) -> Result<Project, String>;
    async fn delete_project(&self, id: i64) -> Result<(), String>;
}
