use super::entities::{Absence, ActivityLog, Event, Feedback, FeedbackComment, Project, Task, User, UserPublic};
use async_trait::async_trait;
use uuid::Uuid;

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn get_all_tasks(&self) -> Result<Vec<Task>, String>;
    async fn add_task(&self, task: Task, co_responsible_ids: Vec<Uuid>) -> Result<Task, String>;
    async fn add_tasks_batch(&self, tasks: Vec<Task>, co_ids: Vec<Vec<Uuid>>) -> Result<Vec<Task>, String>;
    async fn get_task_by_id(&self, id: Uuid) -> Result<Option<Task>, String>;
    async fn update_task(&self, task: Task, co_responsible_ids: Vec<Uuid>) -> Result<Task, String>;
    async fn delete_task(&self, id: Uuid) -> Result<(), String>;
}

#[async_trait]
pub trait ProjectRepository: Send + Sync {
    async fn get_all_projects(&self) -> Result<Vec<Project>, String>;
    async fn add_project(&self, project: Project) -> Result<Project, String>;
    async fn get_project_by_id(&self, id: Uuid) -> Result<Option<Project>, String>;
    async fn update_project(&self, project: Project) -> Result<Project, String>;
    async fn delete_project(&self, id: Uuid) -> Result<(), String>;
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create(&self, user: User) -> Result<User, String>;
    async fn find_by_username(&self, username: &str) -> Result<Option<User>, String>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, String>;
    async fn find_all(&self) -> Result<Vec<User>, String>;
    async fn find_all_public(&self) -> Result<Vec<UserPublic>, String>;
    async fn update_password(&self, id: Uuid, new_hash: &str) -> Result<(), String>;
    async fn set_must_change_password(&self, id: Uuid, value: bool) -> Result<(), String>;
    async fn update_name(&self, id: Uuid, name: String) -> Result<(), String>;
    async fn delete_user(&self, id: Uuid) -> Result<(), String>;
    async fn update_role(&self, id: Uuid, role: String) -> Result<(), String>;
}

#[async_trait]
pub trait AbsenceRepository: Send + Sync {
    async fn add(&self, absence: Absence) -> Result<Absence, String>;
    async fn get_all(&self) -> Result<Vec<Absence>, String>;
    async fn update(&self, id: Uuid, reason: String, justification: Option<String>, start_date: String, end_date: String) -> Result<Absence, String>;
    async fn delete(&self, id: Uuid) -> Result<(), String>;
}

#[async_trait]
pub trait EventRepository: Send + Sync {
    async fn add(&self, event: Event, responsible_ids: Vec<Uuid>) -> Result<Event, String>;
    async fn get_all(&self) -> Result<Vec<Event>, String>;
    async fn update(&self, event: Event, responsible_ids: Vec<Uuid>) -> Result<Event, String>;
    async fn delete(&self, id: Uuid) -> Result<(), String>;
}

#[async_trait]
pub trait FeedbackRepository: Send + Sync {
    async fn add(&self, feedback: Feedback) -> Result<Feedback, String>;
    async fn get_all(&self) -> Result<Vec<Feedback>, String>;
    async fn update(&self, id: Uuid, tipo: String, titulo: String, descricao: String, severidade: Option<String>, imagens: Option<String>) -> Result<Feedback, String>;
    async fn toggle_upvote(&self, id: Uuid, user_id: String) -> Result<Feedback, String>;
    async fn set_resposta(&self, id: Uuid, resposta: Option<String>) -> Result<Feedback, String>;
    async fn set_status(&self, id: Uuid, status: String) -> Result<Feedback, String>;
    async fn delete(&self, id: Uuid, caller_id: Option<Uuid>) -> Result<(), String>;
}

#[async_trait]
pub trait FeedbackCommentRepository: Send + Sync {
    async fn add(&self, comment: FeedbackComment) -> Result<FeedbackComment, String>;
    async fn get_by_feedback(&self, feedback_id: Uuid) -> Result<Vec<FeedbackComment>, String>;
    async fn delete(&self, id: Uuid, caller_id: Option<Uuid>) -> Result<(), String>;
}

#[async_trait]
pub trait ActivityLogRepository: Send + Sync {
    async fn add(&self, log: ActivityLog) -> Result<ActivityLog, String>;
    async fn get_all(&self) -> Result<Vec<ActivityLog>, String>;
    async fn get_by_entity_type(&self, entity_type: &str) -> Result<Vec<ActivityLog>, String>;
    async fn get_by_user(&self, user_id: Uuid) -> Result<Vec<ActivityLog>, String>;
    async fn clear_all(&self) -> Result<(), String>;
}
