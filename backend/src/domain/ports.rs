use super::entities::Task;
use async_trait::async_trait;

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn get_all_tasks(&self) -> Result<Vec<Task>, String>;
    async fn add_task(&self, task: Task) -> Result<Task, String>;
    async fn get_task_by_id(&self, id: i64) -> Result<Option<Task>, String>;
    async fn update_task(&self, task: Task) -> Result<Task, String>;
    async fn delete_task(&self, id: i64) -> Result<(), String>;
}
