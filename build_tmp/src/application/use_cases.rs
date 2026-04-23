use crate::domain::entities::Task;
use crate::domain::ports::TaskRepository;
use std::sync::Arc;

pub struct TaskService {
    repository: Arc<dyn TaskRepository>,
}

impl TaskService {
    pub fn new(repository: Arc<dyn TaskRepository>) -> Self {
        Self { repository }
    }

    pub async fn fetch_all_tasks(&self) -> Result<Vec<Task>, String> {
        self.repository.get_all_tasks().await
    }

    pub async fn create_task(&self, task: Task) -> Result<Task, String> {
        self.repository.add_task(task).await
    }

    pub async fn get_task(&self, id: u32) -> Result<Option<Task>, String> {
        self.repository.get_task_by_id(id).await
    }

    pub async fn update_task(&self, task: Task) -> Result<Task, String> {
        self.repository.update_task(task).await
    }

    pub async fn delete_task(&self, id: u32) -> Result<(), String> {
        self.repository.delete_task(id).await
    }
}
