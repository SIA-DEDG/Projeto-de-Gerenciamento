use crate::domain::entities::{Absence, Event, Feedback, FeedbackComment, Project, Task};
use crate::domain::ports::{AbsenceRepository, EventRepository, FeedbackCommentRepository, FeedbackRepository, ProjectRepository, TaskRepository};
use std::sync::Arc;
use uuid::Uuid;

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

    pub async fn fetch_archived_tasks(&self) -> Result<Vec<Task>, String> {
        self.repository.get_archived_tasks().await
    }

    pub async fn set_task_archived(&self, id: Uuid, archived: bool) -> Result<Task, String> {
        self.repository.set_task_archived(id, archived).await
    }

    pub async fn create_task(
        &self,
        task: Task,
        co_responsible_ids: Vec<Uuid>,
    ) -> Result<Task, String> {
        self.repository.add_task(task, co_responsible_ids).await
    }

    pub async fn get_task(&self, id: Uuid) -> Result<Option<Task>, String> {
        self.repository.get_task_by_id(id).await
    }

    pub async fn update_task(
        &self,
        task: Task,
        co_responsible_ids: Vec<Uuid>,
    ) -> Result<Task, String> {
        self.repository.update_task(task, co_responsible_ids).await
    }

    pub async fn delete_task(&self, id: Uuid) -> Result<(), String> {
        self.repository.delete_task(id).await
    }

    pub async fn create_tasks_batch(&self, tasks: Vec<Task>, co_ids: Vec<Vec<Uuid>>) -> Result<Vec<Task>, String> {
        self.repository.add_tasks_batch(tasks, co_ids).await
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

    pub async fn get_project(&self, id: Uuid) -> Result<Option<Project>, String> {
        self.repository.get_project_by_id(id).await
    }

    pub async fn update_project(&self, project: Project) -> Result<Project, String> {
        self.repository.update_project(project).await
    }

    pub async fn delete_project(&self, id: Uuid) -> Result<(), String> {
        self.repository.delete_project(id).await
    }
}

pub struct AbsenceService {
    repository: Arc<dyn AbsenceRepository>,
}
impl AbsenceService {
    pub fn new(repository: Arc<dyn AbsenceRepository>) -> Self {
        Self { repository }
    }
    pub async fn add(&self, absence: Absence) -> Result<Absence, String> {
        self.repository.add(absence).await
    }
    pub async fn get_all(&self) -> Result<Vec<Absence>, String> {
        self.repository.get_all().await
    }
    pub async fn update(&self, id: uuid::Uuid, reason: String, justification: Option<String>, start_date: String, end_date: String) -> Result<Absence, String> {
        self.repository.update(id, reason, justification, start_date, end_date).await
    }
    pub async fn set_approval_status(&self, id: uuid::Uuid, status: String) -> Result<Absence, String> {
        self.repository.set_approval_status(id, status).await
    }
    pub async fn delete(&self, id: uuid::Uuid) -> Result<(), String> {
        self.repository.delete(id).await
    }
}

pub struct EventService {
    repository: Arc<dyn EventRepository>,
}
impl EventService {
    pub fn new(repository: Arc<dyn EventRepository>) -> Self {
        Self { repository }
    }
    pub async fn add(&self, event: Event, responsible_ids: Vec<Uuid>) -> Result<Event, String> {
        self.repository.add(event, responsible_ids).await
    }
    pub async fn get_all(&self) -> Result<Vec<Event>, String> {
        self.repository.get_all().await
    }
    pub async fn update(&self, event: Event, responsible_ids: Vec<Uuid>) -> Result<Event, String> {
        self.repository.update(event, responsible_ids).await
    }
    pub async fn set_minutes(&self, id: uuid::Uuid, file_name: Option<String>, file_data: Option<String>) -> Result<Event, String> {
        self.repository.set_minutes(id, file_name, file_data).await
    }
    pub async fn delete(&self, id: uuid::Uuid) -> Result<(), String> {
        self.repository.delete(id).await
    }
}

pub struct FeedbackService {
    repository: Arc<dyn FeedbackRepository>,
}
impl FeedbackService {
    pub fn new(repository: Arc<dyn FeedbackRepository>) -> Self {
        Self { repository }
    }
    pub async fn add(&self, feedback: Feedback) -> Result<Feedback, String> {
        self.repository.add(feedback).await
    }
    pub async fn get_all(&self) -> Result<Vec<Feedback>, String> {
        self.repository.get_all().await
    }
    pub async fn update_feedback(&self, id: Uuid, tipo: String, titulo: String, descricao: String, severidade: Option<String>, imagens: Option<String>) -> Result<Feedback, String> {
        self.repository.update(id, tipo, titulo, descricao, severidade, imagens).await
    }
    pub async fn toggle_upvote(&self, id: Uuid, user_id: String) -> Result<Feedback, String> {
        self.repository.toggle_upvote(id, user_id).await
    }
    pub async fn set_resposta(&self, id: Uuid, resposta: Option<String>) -> Result<Feedback, String> {
        self.repository.set_resposta(id, resposta).await
    }
    pub async fn set_status(&self, id: Uuid, status: String) -> Result<Feedback, String> {
        self.repository.set_status(id, status).await
    }
    pub async fn delete(&self, id: Uuid, caller_id: Option<Uuid>) -> Result<(), String> {
        self.repository.delete(id, caller_id).await
    }
}

pub struct FeedbackCommentService {
    repository: Arc<dyn FeedbackCommentRepository>,
}
impl FeedbackCommentService {
    pub fn new(repository: Arc<dyn FeedbackCommentRepository>) -> Self {
        Self { repository }
    }
    pub async fn add(&self, comment: FeedbackComment) -> Result<FeedbackComment, String> {
        self.repository.add(comment).await
    }
    pub async fn get_by_feedback(&self, feedback_id: Uuid) -> Result<Vec<FeedbackComment>, String> {
        self.repository.get_by_feedback(feedback_id).await
    }
    pub async fn delete(&self, id: Uuid, caller_id: Option<Uuid>) -> Result<(), String> {
        self.repository.delete(id, caller_id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::{Absence, Project, Task};
    use crate::domain::ports::{AbsenceRepository, ProjectRepository, TaskRepository};
    use async_trait::async_trait;
    use std::sync::Mutex;

    // ── Mock TaskRepository ───────────────────────────────────────────────────

    struct MockTaskRepo {
        tasks: Mutex<Vec<Task>>,
    }
    impl MockTaskRepo {
        fn new() -> Self {
            Self {
                tasks: Mutex::new(vec![]),
            }
        }
    }

    #[async_trait]
    impl TaskRepository for MockTaskRepo {
        async fn get_all_tasks(&self) -> Result<Vec<Task>, String> {
            Ok(self.tasks.lock().unwrap().iter().filter(|t| !t.archived).cloned().collect())
        }
        async fn get_archived_tasks(&self) -> Result<Vec<Task>, String> {
            Ok(self.tasks.lock().unwrap().iter().filter(|t| t.archived).cloned().collect())
        }
        async fn add_task(
            &self,
            mut task: Task,
            _co_responsible_ids: Vec<Uuid>,
        ) -> Result<Task, String> {
            task.id = Uuid::new_v4();
            self.tasks.lock().unwrap().push(task.clone());
            Ok(task)
        }
        async fn get_task_by_id(&self, id: Uuid) -> Result<Option<Task>, String> {
            Ok(self
                .tasks
                .lock()
                .unwrap()
                .iter()
                .find(|t| t.id == id)
                .cloned())
        }
        async fn update_task(
            &self,
            task: Task,
            _co_responsible_ids: Vec<Uuid>,
        ) -> Result<Task, String> {
            let mut tasks = self.tasks.lock().unwrap();
            match tasks.iter_mut().find(|t| t.id == task.id) {
                Some(t) => {
                    *t = task.clone();
                    Ok(task)
                }
                None => Err("Task não encontrada".to_string()),
            }
        }
        async fn add_tasks_batch(&self, tasks: Vec<Task>, co_ids: Vec<Vec<Uuid>>) -> Result<Vec<Task>, String> {
            let mut created = Vec::with_capacity(tasks.len());
            for (i, task) in tasks.into_iter().enumerate() {
                let ids = co_ids.get(i).cloned().unwrap_or_default();
                created.push(self.add_task(task, ids).await?);
            }
            Ok(created)
        }

        async fn set_task_archived(&self, id: Uuid, archived: bool) -> Result<Task, String> {
            let mut tasks = self.tasks.lock().unwrap();
            match tasks.iter_mut().find(|t| t.id == id) {
                Some(t) => { t.archived = archived; Ok(t.clone()) }
                None => Err(format!("Task {} não encontrada", id)),
            }
        }
        async fn delete_task(&self, id: Uuid) -> Result<(), String> {
            let mut tasks = self.tasks.lock().unwrap();
            let before = tasks.len();
            tasks.retain(|t| t.id != id);
            if tasks.len() < before {
                Ok(())
            } else {
                Err(format!("Task {} não encontrada", id))
            }
        }
    }

    // ── Mock ProjectRepository ────────────────────────────────────────────────

    struct MockProjectRepo {
        projects: Mutex<Vec<Project>>,
    }
    impl MockProjectRepo {
        fn new() -> Self {
            Self {
                projects: Mutex::new(vec![]),
            }
        }
    }

    #[async_trait]
    impl ProjectRepository for MockProjectRepo {
        async fn get_all_projects(&self) -> Result<Vec<Project>, String> {
            Ok(self.projects.lock().unwrap().clone())
        }
        async fn add_project(&self, mut p: Project) -> Result<Project, String> {
            p.id = Uuid::new_v4();
            self.projects.lock().unwrap().push(p.clone());
            Ok(p)
        }
        async fn get_project_by_id(&self, id: Uuid) -> Result<Option<Project>, String> {
            Ok(self
                .projects
                .lock()
                .unwrap()
                .iter()
                .find(|p| p.id == id)
                .cloned())
        }
        async fn update_project(&self, project: Project) -> Result<Project, String> {
            let mut projects = self.projects.lock().unwrap();
            match projects.iter_mut().find(|p| p.id == project.id) {
                Some(p) => {
                    *p = project.clone();
                    Ok(project)
                }
                None => Err("Projeto não encontrado".to_string()),
            }
        }
        async fn delete_project(&self, id: Uuid) -> Result<(), String> {
            let mut projects = self.projects.lock().unwrap();
            let before = projects.len();
            projects.retain(|p| p.id != id);
            if projects.len() < before {
                Ok(())
            } else {
                Err(format!("Projeto {} não encontrado", id))
            }
        }
    }

    // ── Mock AbsenceRepository ────────────────────────────────────────────────

    struct MockAbsenceRepo {
        absences: Mutex<Vec<Absence>>,
    }
    impl MockAbsenceRepo {
        fn new() -> Self {
            Self {
                absences: Mutex::new(vec![]),
            }
        }
    }

    #[async_trait]
    impl AbsenceRepository for MockAbsenceRepo {
        async fn add(&self, mut absence: Absence) -> Result<Absence, String> {
            absence.id = Uuid::new_v4();
            self.absences.lock().unwrap().push(absence.clone());
            Ok(absence)
        }
        async fn get_all(&self) -> Result<Vec<Absence>, String> {
            Ok(self.absences.lock().unwrap().clone())
        }
        async fn update(&self, id: Uuid, reason: String, justification: Option<String>, start_date: String, end_date: String) -> Result<Absence, String> {
            let mut absences = self.absences.lock().unwrap();
            match absences.iter_mut().find(|a| a.id == id) {
                Some(a) => {
                    a.reason = reason;
                    a.justification = justification;
                    a.start_date = start_date;
                    a.end_date = end_date;
                    Ok(a.clone())
                }
                None => Err(format!("Falta {} não encontrada", id)),
            }
        }
        async fn set_approval_status(&self, id: Uuid, status: String) -> Result<Absence, String> {
            let mut absences = self.absences.lock().unwrap();
            match absences.iter_mut().find(|a| a.id == id) {
                Some(a) => { a.approval_status = status; Ok(a.clone()) }
                None => Err(format!("Falta {} não encontrada", id)),
            }
        }
        async fn delete(&self, id: Uuid) -> Result<(), String> {
            let mut absences = self.absences.lock().unwrap();
            let before = absences.len();
            absences.retain(|a| a.id != id);
            if absences.len() < before {
                Ok(())
            } else {
                Err(format!("Falta {} não encontrada", id))
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn sample_task() -> Task {
        Task {
            id: Uuid::nil(),
            category: "TI".to_string(),
            activity: "Testar sistema".to_string(),
            responsible_id: None,
            responsible: "João".to_string(),
            status: "Pendente".to_string(),
            priority: "Média".to_string(),
            created_at: "2024-01-01".to_string(),
            description: None,
            project_id: None,
            co_responsibles: None,
            external_collaborators: None,
            deadline: None,
            archived: false,
        }
    }

    fn sample_project() -> Project {
        Project {
            id: Uuid::nil(),
            name: "Projeto Alpha".to_string(),
            category: Some("TI".to_string()),
            owner_id: None,
            owner: Some("Maria".to_string()),
            deadline: None,
            executive_status: None,
            objective: None,
            scope: None,
            summary: None,
        }
    }

    fn sample_absence() -> Absence {
        Absence {
            id: Uuid::nil(),
            user_id: None,
            employee_name: "João".to_string(),
            reason: "Doença".to_string(),
            justification: None,
            file_name: None,
            file_data: None,
            start_date: "2024-01-10".to_string(),
            end_date: "2024-01-12".to_string(),
            approval_status: "pendente".to_string(),
            created_at: String::new(),
        }
    }

    // ── TaskService tests ─────────────────────────────────────────────────────

    #[tokio::test]
    async fn task_create_and_fetch() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let task = svc.create_task(sample_task(), vec![]).await.unwrap();
        assert!(!task.id.is_nil());
        assert_eq!(svc.fetch_all_tasks().await.unwrap().len(), 1);
    }

    #[tokio::test]
    async fn task_get_by_id_found() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let created = svc.create_task(sample_task(), vec![]).await.unwrap();
        let found = svc.get_task(created.id).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, created.id);
    }

    #[tokio::test]
    async fn task_get_by_id_not_found() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        assert!(svc.get_task(Uuid::new_v4()).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn task_update_status() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let mut task = svc.create_task(sample_task(), vec![]).await.unwrap();
        task.status = "Concluído".to_string();
        let updated = svc.update_task(task, vec![]).await.unwrap();
        assert_eq!(updated.status, "Concluído");
    }

    #[tokio::test]
    async fn task_delete() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let task = svc.create_task(sample_task(), vec![]).await.unwrap();
        svc.delete_task(task.id).await.unwrap();
        assert!(svc.fetch_all_tasks().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn task_batch_create_all_unique_ids() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let created = svc
            .create_tasks_batch(vec![sample_task(), sample_task(), sample_task()], vec![])
            .await
            .unwrap();
        assert_eq!(created.len(), 3);
        let ids: std::collections::HashSet<_> = created.iter().map(|t| t.id).collect();
        assert_eq!(ids.len(), 3);
    }

    // ── ProjectService tests ──────────────────────────────────────────────────

    #[tokio::test]
    async fn project_create_and_fetch() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        let p = svc.create_project(sample_project()).await.unwrap();
        assert!(!p.id.is_nil());
        assert_eq!(svc.fetch_all_projects().await.unwrap().len(), 1);
    }

    #[tokio::test]
    async fn project_get_by_id_found() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        let created = svc.create_project(sample_project()).await.unwrap();
        assert!(svc.get_project(created.id).await.unwrap().is_some());
    }

    #[tokio::test]
    async fn project_get_by_id_not_found() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        assert!(svc.get_project(Uuid::new_v4()).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn project_update_name() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        let mut p = svc.create_project(sample_project()).await.unwrap();
        p.name = "Projeto Beta".to_string();
        let updated = svc.update_project(p).await.unwrap();
        assert_eq!(updated.name, "Projeto Beta");
    }

    #[tokio::test]
    async fn project_delete() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        let p = svc.create_project(sample_project()).await.unwrap();
        svc.delete_project(p.id).await.unwrap();
        assert!(svc.fetch_all_projects().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn project_update_returns_all_updated_fields() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        let mut p = svc.create_project(sample_project()).await.unwrap();
        p.name = "Projeto Atualizado".to_string();
        p.executive_status = Some("Atenção".to_string());
        p.deadline = Some("2025-12-31".to_string());
        let updated = svc.update_project(p).await.unwrap();
        assert_eq!(updated.name, "Projeto Atualizado");
        assert_eq!(updated.executive_status.as_deref(), Some("Atenção"));
        assert_eq!(updated.deadline.as_deref(), Some("2025-12-31"));
    }

    #[tokio::test]
    async fn project_update_nonexistent_returns_error() {
        let svc = ProjectService::new(Arc::new(MockProjectRepo::new()));
        let mut p = sample_project();
        p.id = Uuid::new_v4(); // not in repo
        let result = svc.update_project(p).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn task_update_nonexistent_returns_error() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let mut t = sample_task();
        t.id = Uuid::new_v4(); // not in repo
        let result = svc.update_task(t, vec![]).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn task_delete_nonexistent_returns_error() {
        let svc = TaskService::new(Arc::new(MockTaskRepo::new()));
        let result = svc.delete_task(Uuid::new_v4()).await;
        assert!(result.is_err());
    }

    // ── AbsenceService tests ──────────────────────────────────────────────────

    #[tokio::test]
    async fn absence_add_returns_non_nil_id() {
        let svc = AbsenceService::new(Arc::new(MockAbsenceRepo::new()));
        let absence = svc.add(sample_absence()).await.unwrap();
        assert!(!absence.id.is_nil());
    }

    #[tokio::test]
    async fn absence_add_and_fetch() {
        let svc = AbsenceService::new(Arc::new(MockAbsenceRepo::new()));
        svc.add(sample_absence()).await.unwrap();
        let all = svc.get_all().await.unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].reason, "Doença");
    }

    #[tokio::test]
    async fn absence_add_multiple_all_unique_ids() {
        let svc = AbsenceService::new(Arc::new(MockAbsenceRepo::new()));
        svc.add(sample_absence()).await.unwrap();
        svc.add(sample_absence()).await.unwrap();
        let all = svc.get_all().await.unwrap();
        assert_eq!(all.len(), 2);
        assert_ne!(all[0].id, all[1].id);
    }

    #[tokio::test]
    async fn absence_delete_removes_entry() {
        let svc = AbsenceService::new(Arc::new(MockAbsenceRepo::new()));
        let created = svc.add(sample_absence()).await.unwrap();
        svc.delete(created.id).await.unwrap();
        assert!(svc.get_all().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn absence_delete_nonexistent_returns_error() {
        let svc = AbsenceService::new(Arc::new(MockAbsenceRepo::new()));
        let result = svc.delete(Uuid::new_v4()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn absence_get_all_starts_empty() {
        let svc = AbsenceService::new(Arc::new(MockAbsenceRepo::new()));
        assert!(svc.get_all().await.unwrap().is_empty());
    }
}
