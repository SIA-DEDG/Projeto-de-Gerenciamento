use super::entities::Task;

pub trait TaskRepository: Send + Sync {
    fn get_all_tasks(&self) -> impl std::future::Future<Output = Result<Vec<Task>, String>> + Send;
    fn add_task(&self, task: Task) -> impl std::future::Future<Output = Result<Task, String>> + Send;
    fn get_task_by_id(&self, id: u32) -> impl std::future::Future<Output = Result<Option<Task>, String>> + Send;
    fn update_task(&self, task: Task) -> impl std::future::Future<Output = Result<Task, String>> + Send;
    fn delete_task(&self, id: u32) -> impl std::future::Future<Output = Result<(), String>> + Send;
}
