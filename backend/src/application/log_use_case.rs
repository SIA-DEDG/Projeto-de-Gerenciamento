use crate::domain::entities::ActivityLog;
use crate::domain::ports::ActivityLogRepository;
use std::sync::Arc;
use uuid::Uuid;

pub struct LogService {
    repo: Arc<dyn ActivityLogRepository>,
}

impl LogService {
    pub fn new(repo: Arc<dyn ActivityLogRepository>) -> Self {
        Self { repo }
    }

    pub async fn add(
        &self,
        user_id: Uuid,
        user_name: &str,
        action: &str,
        entity_type: &str,
        entity_id: &str,
        details: &str,
    ) -> Result<ActivityLog, String> {
        let log = ActivityLog {
            id: Uuid::nil(),
            user_id,
            user_name: user_name.to_string(),
            action: action.to_string(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            details: details.to_string(),
            created_at: String::new(),
        };
        self.repo.add(log).await
    }

    pub async fn get_all(&self) -> Result<Vec<ActivityLog>, String> {
        self.repo.get_all().await
    }

    pub async fn get_by_entity_type(&self, entity_type: &str) -> Result<Vec<ActivityLog>, String> {
        self.repo.get_by_entity_type(entity_type).await
    }

    pub async fn get_by_user(&self, user_id: Uuid) -> Result<Vec<ActivityLog>, String> {
        self.repo.get_by_user(user_id).await
    }

    pub async fn clear_all(&self) -> Result<(), String> {
        self.repo.clear_all().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::ActivityLog;
    use crate::domain::ports::ActivityLogRepository;
    use async_trait::async_trait;
    use std::sync::Mutex;

    struct MockLogRepo {
        logs: Mutex<Vec<ActivityLog>>,
    }
    impl MockLogRepo {
        fn new() -> Self {
            Self {
                logs: Mutex::new(vec![]),
            }
        }
    }

    #[async_trait]
    impl ActivityLogRepository for MockLogRepo {
        async fn add(&self, mut log: ActivityLog) -> Result<ActivityLog, String> {
            log.id = Uuid::new_v4();
            log.created_at = "01/01/2024 10:00".to_string();
            self.logs.lock().unwrap().push(log.clone());
            Ok(log)
        }
        async fn get_all(&self) -> Result<Vec<ActivityLog>, String> {
            Ok(self.logs.lock().unwrap().clone())
        }
        async fn get_by_entity_type(&self, et: &str) -> Result<Vec<ActivityLog>, String> {
            Ok(self
                .logs
                .lock()
                .unwrap()
                .iter()
                .filter(|l| l.entity_type == et)
                .cloned()
                .collect())
        }
        async fn get_by_user(&self, uid: Uuid) -> Result<Vec<ActivityLog>, String> {
            Ok(self
                .logs
                .lock()
                .unwrap()
                .iter()
                .filter(|l| l.user_id == uid)
                .cloned()
                .collect())
        }
        async fn clear_all(&self) -> Result<(), String> {
            self.logs.lock().unwrap().clear();
            Ok(())
        }
    }

    #[tokio::test]
    async fn add_log_and_get_all() {
        let svc = LogService::new(Arc::new(MockLogRepo::new()));
        let uid = Uuid::new_v4();
        svc.add(uid, "Admin", "CREATE", "task", "abc-123", "Criou tarefa X")
            .await
            .unwrap();
        let all = svc.get_all().await.unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].action, "CREATE");
        assert_eq!(all[0].entity_type, "task");
    }

    #[tokio::test]
    async fn filter_by_entity_type() {
        let svc = LogService::new(Arc::new(MockLogRepo::new()));
        let uid = Uuid::new_v4();
        svc.add(uid, "A", "CREATE", "task", "t1", "").await.unwrap();
        svc.add(uid, "A", "CREATE", "project", "p1", "")
            .await
            .unwrap();
        svc.add(uid, "A", "DELETE", "task", "t2", "").await.unwrap();
        let tasks = svc.get_by_entity_type("task").await.unwrap();
        assert_eq!(tasks.len(), 2);
        let projects = svc.get_by_entity_type("project").await.unwrap();
        assert_eq!(projects.len(), 1);
    }

    #[tokio::test]
    async fn filter_by_user() {
        let svc = LogService::new(Arc::new(MockLogRepo::new()));
        let u1 = Uuid::new_v4();
        let u2 = Uuid::new_v4();
        svc.add(u1, "U1", "CREATE", "task", "t1", "").await.unwrap();
        svc.add(u2, "U2", "CREATE", "task", "t2", "").await.unwrap();
        svc.add(u1, "U1", "DELETE", "task", "t3", "").await.unwrap();
        assert_eq!(svc.get_by_user(u1).await.unwrap().len(), 2);
        assert_eq!(svc.get_by_user(u2).await.unwrap().len(), 1);
    }
}
