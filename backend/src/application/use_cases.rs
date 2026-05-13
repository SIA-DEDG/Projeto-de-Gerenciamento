use crate::domain::entities::{Task, Project};
use crate::domain::ports::{TaskRepository, ProjectRepository};
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

    pub async fn get_task(&self, id: i64) -> Result<Option<Task>, String> {
        self.repository.get_task_by_id(id).await
    }

    pub async fn update_task(&self, task: Task) -> Result<Task, String> {
        self.repository.update_task(task).await
    }

    pub async fn delete_task(&self, id: i64) -> Result<(), String> {
        self.repository.delete_task(id).await
    }
}

pub struct ProjectService {
    repository: Arc<dyn ProjectRepository>,
}

impl ProjectService {
    pub fn new(repository: Arc<dyn ProjectRepository>) -> Self {
        Self { repository }
    }

    pub async fn fetch_all_projects(&self) -> Result<Vec<Project>, String> {
        self.repository.get_all_projects().await
    }

    pub async fn create_project(&self, project: Project) -> Result<Project, String> {
        self.repository.add_project(project).await
    }

    pub async fn get_project(&self, id: i64) -> Result<Option<Project>, String> {
        self.repository.get_project_by_id(id).await
    }

    pub async fn update_project(&self, project: Project) -> Result<Project, String> {
        self.repository.update_project(project).await
    }

    pub async fn delete_project(&self, id: i64) -> Result<(), String> {
        self.repository.delete_project(id).await
    }
}
