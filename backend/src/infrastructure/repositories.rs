use crate::domain::entities::{Absence, ActivityLog, Event, Feedback, FeedbackComment, Project, Task, User, UserPublic};
use crate::domain::ports::{
    AbsenceRepository, ActivityLogRepository, EventRepository, FeedbackCommentRepository,
    FeedbackRepository, ProjectRepository, TaskRepository, UserRepository,
};
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;


const TASK_SELECT: &str = r#"
    SELECT
      t.id, t.category, t.activity, t.status, t.priority,
      to_char(t.created_at, 'YYYY-MM-DD') AS created_at,
      t.description, t.project_id,
      t.responsible_id,
      COALESCE(u.name, '') AS responsible,
      t.external_collaborators,
      t.deadline::text AS deadline,
      t.archived,
      (SELECT json_agg(u2.name ORDER BY u2.name)::text
       FROM task_co_responsibles tcr
       JOIN users u2 ON u2.id = tcr.user_id
       WHERE tcr.task_id = t.id) AS co_responsibles
    FROM tasks t
    LEFT JOIN users u ON u.id = t.responsible_id
"#;

const PROJECT_SELECT: &str = r#"
    SELECT
      p.id, p.name, p.category,
      p.owner_id,
      u.name AS owner,
      p.deadline::text AS deadline,
      p.executive_status, p.objective, p.scope, p.summary
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_id
"#;

const ABSENCE_SELECT: &str = r#"
    SELECT
      a.id, a.user_id,
      COALESCE(u.name, '') AS employee_name,
      a.reason, a.justification, a.file_name, a.file_data,
      to_char(a.start_date, 'YYYY-MM-DD') AS start_date,
      to_char(a.end_date,   'YYYY-MM-DD') AS end_date,
      COALESCE(a.approval_status, 'pendente') AS approval_status,
      to_char(a.created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
    FROM absences a
    LEFT JOIN users u ON u.id = a.user_id
"#;

const EVENT_SELECT: &str = r#"
    SELECT
      e.id, e.name, e.event_type, e.attendees, e.start_time,
      e.minutes_file_name, e.minutes_file_data,
      to_char(e.start_date, 'YYYY-MM-DD') AS start_date,
      to_char(e.end_date,   'YYYY-MM-DD') AS end_date,
      to_char(e.created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at,
      COALESCE(
        (SELECT json_agg(u.name ORDER BY u.name)::text
         FROM event_responsibles er
         JOIN users u ON u.id = er.user_id
         WHERE er.event_id = e.id),
        '[]'
      ) AS responsibles
    FROM events e
"#;


pub struct PostgresTaskRepository {
    pub pool: PgPool,
}

impl PostgresTaskRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TaskRepository for PostgresTaskRepository {
    async fn get_all_tasks(&self) -> Result<Vec<Task>, String> {
        let sql = format!("{} WHERE t.archived = false ORDER BY t.created_at ASC", TASK_SELECT);
        sqlx::query_as::<_, Task>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn get_archived_tasks(&self) -> Result<Vec<Task>, String> {
        let sql = format!("{} WHERE t.archived = true ORDER BY t.created_at DESC", TASK_SELECT);
        sqlx::query_as::<_, Task>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn add_task(&self, task: Task, co_responsible_ids: Vec<Uuid>) -> Result<Task, String> {
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let inserted_id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO tasks
               (category, activity, responsible_id, status, priority, created_at, description, project_id, external_collaborators, deadline)
               VALUES ($1, $2, $3, $4, $5,
                       COALESCE(NULLIF($6, ''), to_char(now(), 'YYYY-MM-DD'))::date,
                       $7, $8, $9, NULLIF($10, '')::date)
               RETURNING id"#,
        )
        .bind(&task.category)
        .bind(&task.activity)
        .bind(task.responsible_id)
        .bind(&task.status)
        .bind(&task.priority)
        .bind(&task.created_at)
        .bind(&task.description)
        .bind(task.project_id)
        .bind(&task.external_collaborators)
        .bind(&task.deadline)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        for uid in &co_responsible_ids {
            sqlx::query(
                "INSERT INTO task_co_responsibles (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(inserted_id)
            .bind(uid)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;

        self.get_task_by_id(inserted_id)
            .await
            .map(|task| task.expect("just inserted"))
    }

    async fn add_tasks_batch(&self, tasks: Vec<Task>, co_ids: Vec<Vec<Uuid>>) -> Result<Vec<Task>, String> {
        if tasks.is_empty() {
            return Ok(vec![]);
        }
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;
        let mut ids: Vec<Uuid> = Vec::with_capacity(tasks.len());

        for (i, task) in tasks.iter().enumerate() {
            let id: Uuid = sqlx::query_scalar(
                r#"INSERT INTO tasks
                   (category, activity, responsible_id, status, priority, created_at, description, project_id, external_collaborators, deadline)
                   VALUES ($1, $2, $3, $4, $5,
                           COALESCE(NULLIF($6, ''), to_char(now(), 'YYYY-MM-DD'))::date,
                           $7, $8, $9, NULLIF($10, '')::date)
                   RETURNING id"#,
            )
            .bind(&task.category)
            .bind(&task.activity)
            .bind(task.responsible_id)
            .bind(&task.status)
            .bind(&task.priority)
            .bind(&task.created_at)
            .bind(&task.description)
            .bind(task.project_id)
            .bind(&task.external_collaborators)
            .bind(&task.deadline)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            if let Some(uids) = co_ids.get(i) {
                for uid in uids {
                    sqlx::query(
                        "INSERT INTO task_co_responsibles (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    )
                    .bind(id)
                    .bind(uid)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                }
            }

            ids.push(id);
        }

        tx.commit().await.map_err(|e| e.to_string())?;

        let sql = format!("{} WHERE t.id = ANY($1::uuid[]) ORDER BY t.created_at ASC", TASK_SELECT);
        sqlx::query_as::<_, Task>(&sql)
            .bind(&ids)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn get_task_by_id(&self, id: Uuid) -> Result<Option<Task>, String> {
        let sql = format!("{} WHERE t.id = $1", TASK_SELECT);
        sqlx::query_as::<_, Task>(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn update_task(&self, task: Task, co_responsible_ids: Vec<Uuid>) -> Result<Task, String> {
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let rows = sqlx::query(
            r#"UPDATE tasks
               SET category = $2, activity = $3, responsible_id = $4, status = $5, priority = $6,
                   created_at = COALESCE(NULLIF($7, ''), to_char(now(), 'YYYY-MM-DD'))::date,
                   description = $8, project_id = $9, external_collaborators = $10,
                   deadline = NULLIF($11, '')::date
               WHERE id = $1"#,
        )
        .bind(task.id)
        .bind(&task.category)
        .bind(&task.activity)
        .bind(task.responsible_id)
        .bind(&task.status)
        .bind(&task.priority)
        .bind(&task.created_at)
        .bind(&task.description)
        .bind(task.project_id)
        .bind(&task.external_collaborators)
        .bind(&task.deadline)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        if rows.rows_affected() == 0 {
            return Err(format!("Task {} não encontrada", task.id));
        }

        sqlx::query("DELETE FROM task_co_responsibles WHERE task_id = $1")
            .bind(task.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        for uid in &co_responsible_ids {
            sqlx::query(
                "INSERT INTO task_co_responsibles (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(task.id)
            .bind(uid)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;

        self.get_task_by_id(task.id)
            .await
            .map(|task| task.expect("just updated"))
    }

    async fn set_task_archived(&self, id: Uuid, archived: bool) -> Result<Task, String> {
        let rows = sqlx::query("UPDATE tasks SET archived = $2 WHERE id = $1")
            .bind(id)
            .bind(archived)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if rows.rows_affected() == 0 {
            return Err(format!("Task {} não encontrada", id));
        }
        self.get_task_by_id(id).await.map(|t| t.expect("just updated"))
    }

    async fn delete_task(&self, id: Uuid) -> Result<(), String> {
        let result = sqlx::query("DELETE FROM tasks WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if result.rows_affected() == 0 {
            Err(format!("Task {} não encontrada", id))
        } else {
            Ok(())
        }
    }
}


pub struct PostgresProjectRepository {
    pool: PgPool,
}

impl PostgresProjectRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ProjectRepository for PostgresProjectRepository {
    async fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        let sql = format!("{} ORDER BY p.name ASC", PROJECT_SELECT);
        sqlx::query_as::<_, Project>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn add_project(&self, project: Project) -> Result<Project, String> {
        let id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO projects (name, category, owner_id, deadline, executive_status, objective, scope, summary)
               VALUES ($1, $2, $3, NULLIF($4, '')::date, $5, $6, $7, $8)
               RETURNING id"#,
        )
        .bind(&project.name)
        .bind(&project.category)
        .bind(project.owner_id)
        .bind(&project.deadline)
        .bind(&project.executive_status)
        .bind(&project.objective)
        .bind(&project.scope)
        .bind(&project.summary)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        self.get_project_by_id(id)
            .await
            .map(|project| project.expect("projeto recém-inserido"))
    }

    async fn get_project_by_id(&self, id: Uuid) -> Result<Option<Project>, String> {
        let sql = format!("{} WHERE p.id = $1", PROJECT_SELECT);
        sqlx::query_as::<_, Project>(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn update_project(&self, project: Project) -> Result<Project, String> {
        let rows = sqlx::query(
            r#"UPDATE projects
               SET name = $2, category = $3, owner_id = $4, deadline = NULLIF($5, '')::date,
                   executive_status = $6, objective = $7, scope = $8, summary = $9,
                   updated_at = NOW()
               WHERE id = $1"#,
        )
        .bind(project.id)
        .bind(&project.name)
        .bind(&project.category)
        .bind(project.owner_id)
        .bind(&project.deadline)
        .bind(&project.executive_status)
        .bind(&project.objective)
        .bind(&project.scope)
        .bind(&project.summary)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        if rows.rows_affected() == 0 {
            return Err(format!("Projeto {} não encontrado", project.id));
        }

        self.get_project_by_id(project.id)
            .await
            .map(|project| project.expect("projeto recém-atualizado"))
    }

    async fn delete_project(&self, id: Uuid) -> Result<(), String> {
        let result = sqlx::query("DELETE FROM projects WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if result.rows_affected() == 0 {
            Err(format!("Projeto {} não encontrado", id))
        } else {
            Ok(())
        }
    }
}


pub struct PostgresUserRepository {
    pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn create(&self, user: User) -> Result<User, String> {
        sqlx::query_as::<_, User>(
            r#"INSERT INTO users (name, username, password_hash, role, must_change_password)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id, name, username, password_hash, role, must_change_password,
                         to_char(created_at, 'YYYY-MM-DD') AS created_at"#,
        )
        .bind(user.name)
        .bind(user.username)
        .bind(user.password_hash)
        .bind(user.role)
        .bind(user.must_change_password)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn find_by_username(&self, username: &str) -> Result<Option<User>, String> {
        sqlx::query_as::<_, User>(
            r#"SELECT id, name, username, password_hash, role, must_change_password,
                      to_char(created_at, 'YYYY-MM-DD') AS created_at
               FROM users WHERE username = $1"#,
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, String> {
        sqlx::query_as::<_, User>(
            r#"SELECT id, name, username, password_hash, role, must_change_password,
                      to_char(created_at, 'YYYY-MM-DD') AS created_at
               FROM users WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn find_all(&self) -> Result<Vec<User>, String> {
        sqlx::query_as::<_, User>(
            r#"SELECT id, name, username, password_hash, role, must_change_password,
                      to_char(created_at, 'YYYY-MM-DD') AS created_at
               FROM users ORDER BY name ASC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn find_all_public(&self) -> Result<Vec<UserPublic>, String> {
        sqlx::query_as::<_, UserPublic>(
            r#"SELECT id, name, username, role, must_change_password,
                      to_char(created_at, 'YYYY-MM-DD') AS created_at
               FROM users ORDER BY name ASC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn update_password(&self, id: Uuid, new_hash: &str) -> Result<(), String> {
        let rows = sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
            .bind(new_hash)
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if rows.rows_affected() == 0 {
            Err("Usuário não encontrado".to_string())
        } else {
            Ok(())
        }
    }

    async fn set_must_change_password(&self, id: Uuid, value: bool) -> Result<(), String> {
        sqlx::query("UPDATE users SET must_change_password = $1 WHERE id = $2")
            .bind(value)
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    async fn update_name(&self, id: Uuid, name: String) -> Result<(), String> {
        sqlx::query("UPDATE users SET name = $1 WHERE id = $2")
            .bind(&name)
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    async fn delete_user(&self, id: Uuid) -> Result<(), String> {
        // FK ON DELETE SET NULL handles tasks/projects/absences automatically.
        // FK ON DELETE CASCADE handles activity_logs and junction tables.
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if result.rows_affected() == 0 {
            Err(format!("Usuário {} não encontrado", id))
        } else {
            Ok(())
        }
    }

    async fn update_role(&self, id: Uuid, role: String) -> Result<(), String> {
        let result = sqlx::query("UPDATE users SET role = $1 WHERE id = $2")
            .bind(&role)
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if result.rows_affected() == 0 {
            Err(format!("Usuário {} não encontrado", id))
        } else {
            Ok(())
        }
    }
}


pub struct PostgresActivityLogRepository {
    pool: PgPool,
}

impl PostgresActivityLogRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ActivityLogRepository for PostgresActivityLogRepository {
    async fn add(&self, log: ActivityLog) -> Result<ActivityLog, String> {
        sqlx::query_as::<_, ActivityLog>(
            r#"INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id, user_id, user_name, action, entity_type, entity_id, details,
                         to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at"#,
        )
        .bind(log.user_id)
        .bind(log.user_name)
        .bind(log.action)
        .bind(log.entity_type)
        .bind(log.entity_id)
        .bind(log.details)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_all(&self) -> Result<Vec<ActivityLog>, String> {
        sqlx::query_as::<_, ActivityLog>(
            r#"SELECT id, user_id, user_name, action, entity_type, entity_id, details,
                      to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM activity_logs ORDER BY activity_logs.created_at DESC LIMIT 500"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_by_entity_type(&self, entity_type: &str) -> Result<Vec<ActivityLog>, String> {
        sqlx::query_as::<_, ActivityLog>(
            r#"SELECT id, user_id, user_name, action, entity_type, entity_id, details,
                      to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM activity_logs WHERE entity_type = $1 ORDER BY activity_logs.created_at DESC LIMIT 500"#,
        )
        .bind(entity_type)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_by_user(&self, user_id: Uuid) -> Result<Vec<ActivityLog>, String> {
        sqlx::query_as::<_, ActivityLog>(
            r#"SELECT id, user_id, user_name, action, entity_type, entity_id, details,
                      to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM activity_logs WHERE user_id = $1 ORDER BY activity_logs.created_at DESC LIMIT 500"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn clear_all(&self) -> Result<(), String> {
        sqlx::query("DELETE FROM activity_logs")
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}


pub struct PostgresAbsenceRepository {
    pool: PgPool,
}

impl PostgresAbsenceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn get_absence_by_id(&self, id: Uuid) -> Result<Option<Absence>, String> {
        let sql = format!("{} WHERE a.id = $1", ABSENCE_SELECT);
        sqlx::query_as::<_, Absence>(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }
}

#[async_trait]
impl AbsenceRepository for PostgresAbsenceRepository {
    async fn add(&self, absence: Absence) -> Result<Absence, String> {
        let id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO absences (user_id, reason, justification, file_name, file_data, start_date, end_date)
               VALUES ($1, $2, $3, $4, $5, $6::date, $7::date)
               RETURNING id"#,
        )
        .bind(absence.user_id)
        .bind(absence.reason)
        .bind(absence.justification)
        .bind(absence.file_name)
        .bind(absence.file_data)
        .bind(absence.start_date)
        .bind(absence.end_date)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        self.get_absence_by_id(id)
            .await
            .map(|absence| absence.expect("falta recém-inserida"))
    }

    async fn get_all(&self) -> Result<Vec<Absence>, String> {
        let sql = format!("{} ORDER BY a.start_date DESC", ABSENCE_SELECT);
        sqlx::query_as::<_, Absence>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn update(&self, id: Uuid, reason: String, justification: Option<String>, start_date: String, end_date: String) -> Result<Absence, String> {
        let rows = sqlx::query(
            r#"UPDATE absences
               SET reason=$2, justification=$3, start_date=$4::date, end_date=$5::date
               WHERE id=$1"#,
        )
        .bind(id)
        .bind(&reason)
        .bind(&justification)
        .bind(&start_date)
        .bind(&end_date)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        if rows.rows_affected() == 0 {
            return Err(format!("Falta {} não encontrada", id));
        }
        self.get_absence_by_id(id)
            .await
            .map(|a| a.expect("falta recém-atualizada"))
    }

    async fn set_approval_status(&self, id: Uuid, status: String) -> Result<Absence, String> {
        let rows = sqlx::query(
            "UPDATE absences SET approval_status=$2 WHERE id=$1",
        )
        .bind(id)
        .bind(&status)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        if rows.rows_affected() == 0 {
            return Err(format!("Falta {} não encontrada", id));
        }
        self.get_absence_by_id(id)
            .await
            .map(|a| a.expect("falta recém-atualizada"))
    }

    async fn delete(&self, id: Uuid) -> Result<(), String> {
        let delete_result = sqlx::query("DELETE FROM absences WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if delete_result.rows_affected() == 0 {
            Err(format!("Falta {} não encontrada", id))
        } else {
            Ok(())
        }
    }
}


pub struct PostgresEventRepository {
    pool: PgPool,
}

impl PostgresEventRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn get_event_by_id(&self, id: Uuid) -> Result<Option<Event>, String> {
        let sql = format!("{} WHERE e.id = $1", EVENT_SELECT);
        sqlx::query_as::<_, Event>(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }
}

#[async_trait]
impl EventRepository for PostgresEventRepository {
    async fn add(&self, event: Event, responsible_ids: Vec<Uuid>) -> Result<Event, String> {
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let inserted_id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO events (name, event_type, attendees, start_date, end_date, start_time)
               VALUES ($1, $2, $3, $4::date, $5::date, $6)
               RETURNING id"#,
        )
        .bind(&event.name)
        .bind(&event.event_type)
        .bind(&event.attendees)
        .bind(&event.start_date)
        .bind(&event.end_date)
        .bind(&event.start_time)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        for uid in &responsible_ids {
            sqlx::query(
                "INSERT INTO event_responsibles (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(inserted_id)
            .bind(uid)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;

        self.get_event_by_id(inserted_id)
            .await
            .map(|event| event.expect("just inserted"))
    }

    async fn get_all(&self) -> Result<Vec<Event>, String> {
        let sql = format!("{} ORDER BY e.start_date DESC", EVENT_SELECT);
        sqlx::query_as::<_, Event>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    async fn update(&self, event: Event, responsible_ids: Vec<Uuid>) -> Result<Event, String> {
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let rows = sqlx::query(
            r#"UPDATE events
               SET name=$2, event_type=$3, attendees=$4,
                   start_date=$5::date, end_date=$6::date, start_time=$7
               WHERE id=$1"#,
        )
        .bind(event.id)
        .bind(&event.name)
        .bind(&event.event_type)
        .bind(&event.attendees)
        .bind(&event.start_date)
        .bind(&event.end_date)
        .bind(&event.start_time)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        if rows.rows_affected() == 0 {
            return Err(format!("Evento {} não encontrado", event.id));
        }

        sqlx::query("DELETE FROM event_responsibles WHERE event_id = $1")
            .bind(event.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        for uid in &responsible_ids {
            sqlx::query(
                "INSERT INTO event_responsibles (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(event.id)
            .bind(uid)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;

        self.get_event_by_id(event.id)
            .await
            .map(|event| event.expect("just updated"))
    }

    async fn set_minutes(&self, id: Uuid, file_name: Option<String>, file_data: Option<String>) -> Result<Event, String> {
        let rows = sqlx::query(
            "UPDATE events SET minutes_file_name=$2, minutes_file_data=$3 WHERE id=$1",
        )
        .bind(id)
        .bind(&file_name)
        .bind(&file_data)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        if rows.rows_affected() == 0 {
            return Err(format!("Evento {} não encontrado", id));
        }
        self.get_event_by_id(id)
            .await
            .map(|e| e.expect("evento recém-atualizado"))
    }

    async fn delete(&self, id: Uuid) -> Result<(), String> {
        let delete_result = sqlx::query("DELETE FROM events WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if delete_result.rows_affected() == 0 {
            Err(format!("Evento {} não encontrado", id))
        } else {
            Ok(())
        }
    }
}


pub struct PostgresFeedbackRepository {
    pool: PgPool,
}

impl PostgresFeedbackRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl FeedbackRepository for PostgresFeedbackRepository {
    async fn add(&self, feedback: Feedback) -> Result<Feedback, String> {
        sqlx::query_as::<_, Feedback>(
            r#"INSERT INTO feedbacks (id, tipo, titulo, descricao, severidade, usuario_id, usuario_nome, imagens)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING id, tipo, titulo, descricao, severidade, usuario_id, usuario_nome, imagens, resposta, status,
                         0::bigint AS upvotes, '[]'::text AS upvoted_by,
                         0::bigint AS comment_count,
                         to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at"#,
        )
        .bind(feedback.id)
        .bind(feedback.tipo)
        .bind(feedback.titulo)
        .bind(feedback.descricao)
        .bind(feedback.severidade)
        .bind(feedback.usuario_id)
        .bind(feedback.usuario_nome)
        .bind(feedback.imagens)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn update(&self, id: Uuid, tipo: String, titulo: String, descricao: String, severidade: Option<String>, imagens: Option<String>) -> Result<Feedback, String> {
        sqlx::query_as::<_, Feedback>(
            r#"WITH upd AS (
                   UPDATE feedbacks
                   SET tipo = $2, titulo = $3, descricao = $4, severidade = $5, imagens = $6
                   WHERE id = $1
                   RETURNING id
               )
               SELECT f.id, f.tipo, f.titulo, f.descricao, f.severidade,
                      f.usuario_id, f.usuario_nome, f.imagens, f.resposta, f.status,
                      COUNT(fu.user_id) AS upvotes,
                      COALESCE(
                          json_agg(fu.user_id::text ORDER BY fu.created_at)
                          FILTER (WHERE fu.user_id IS NOT NULL),
                          '[]'
                      )::text AS upvoted_by,
                      (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = f.id)::bigint AS comment_count,
                      to_char(f.created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM feedbacks f
               LEFT JOIN feedback_upvotes fu ON fu.feedback_id = f.id
               WHERE f.id = (SELECT id FROM upd)
               GROUP BY f.id"#,
        )
        .bind(id)
        .bind(tipo)
        .bind(titulo)
        .bind(descricao)
        .bind(severidade)
        .bind(imagens)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_all(&self) -> Result<Vec<Feedback>, String> {
        sqlx::query_as::<_, Feedback>(
            r#"SELECT f.id, f.tipo, f.titulo, f.descricao, f.severidade,
                      f.usuario_id, f.usuario_nome, f.imagens, f.resposta, f.status,
                      COUNT(fu.user_id) AS upvotes,
                      COALESCE(
                          json_agg(fu.user_id::text ORDER BY fu.created_at)
                          FILTER (WHERE fu.user_id IS NOT NULL),
                          '[]'
                      )::text AS upvoted_by,
                      (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = f.id)::bigint AS comment_count,
                      to_char(f.created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM feedbacks f
               LEFT JOIN feedback_upvotes fu ON fu.feedback_id = f.id
               GROUP BY f.id
               ORDER BY upvotes DESC, f.created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn toggle_upvote(&self, id: Uuid, user_id: String) -> Result<Feedback, String> {
        let uid = Uuid::parse_str(&user_id).map_err(|e| e.to_string())?;
        let exists = sqlx::query(
            "SELECT 1 AS one FROM feedback_upvotes WHERE feedback_id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(uid)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        if exists.is_some() {
            sqlx::query(
                "DELETE FROM feedback_upvotes WHERE feedback_id = $1 AND user_id = $2",
            )
            .bind(id)
            .bind(uid)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "INSERT INTO feedback_upvotes (feedback_id, user_id) VALUES ($1, $2)",
            )
            .bind(id)
            .bind(uid)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        }

        sqlx::query_as::<_, Feedback>(
            r#"SELECT f.id, f.tipo, f.titulo, f.descricao, f.severidade,
                      f.usuario_id, f.usuario_nome, f.imagens, f.resposta, f.status,
                      COUNT(fu.user_id) AS upvotes,
                      COALESCE(
                          json_agg(fu.user_id::text ORDER BY fu.created_at)
                          FILTER (WHERE fu.user_id IS NOT NULL),
                          '[]'
                      )::text AS upvoted_by,
                      (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = f.id)::bigint AS comment_count,
                      to_char(f.created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM feedbacks f
               LEFT JOIN feedback_upvotes fu ON fu.feedback_id = f.id
               WHERE f.id = $1
               GROUP BY f.id"#,
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn set_resposta(&self, id: Uuid, resposta: Option<String>) -> Result<Feedback, String> {
        sqlx::query_as::<_, Feedback>(
            r#"UPDATE feedbacks SET resposta = $2 WHERE id = $1
               RETURNING id, tipo, titulo, descricao, severidade, usuario_id, usuario_nome, imagens, resposta, status,
                         0::bigint AS upvotes, '[]'::text AS upvoted_by,
                         (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = id)::bigint AS comment_count,
                         to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at"#,
        )
        .bind(id)
        .bind(resposta)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn set_status(&self, id: Uuid, status: String) -> Result<Feedback, String> {
        sqlx::query_as::<_, Feedback>(
            r#"UPDATE feedbacks SET status = $2 WHERE id = $1
               RETURNING id, tipo, titulo, descricao, severidade, usuario_id, usuario_nome, imagens, resposta, status,
                         0::bigint AS upvotes, '[]'::text AS upvoted_by,
                         (SELECT COUNT(*) FROM feedback_comments WHERE feedback_id = id)::bigint AS comment_count,
                         to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at"#,
        )
        .bind(id)
        .bind(status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn delete(&self, id: Uuid, caller_id: Option<Uuid>) -> Result<(), String> {
        match caller_id {
            None => sqlx::query("DELETE FROM feedbacks WHERE id = $1")
                .bind(id)
                .execute(&self.pool)
                .await
                .map(|_| ())
                .map_err(|e| e.to_string()),
            Some(uid) => {
                let result = sqlx::query("DELETE FROM feedbacks WHERE id = $1 AND usuario_id = $2")
                    .bind(id)
                    .bind(uid)
                    .execute(&self.pool)
                    .await
                    .map_err(|e| e.to_string())?;
                if result.rows_affected() == 0 {
                    Err("forbidden".to_string())
                } else {
                    Ok(())
                }
            }
        }
    }
}


pub struct PostgresFeedbackCommentRepository {
    pool: PgPool,
}

impl PostgresFeedbackCommentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl FeedbackCommentRepository for PostgresFeedbackCommentRepository {
    async fn add(&self, comment: FeedbackComment) -> Result<FeedbackComment, String> {
        sqlx::query_as::<_, FeedbackComment>(
            r#"INSERT INTO feedback_comments (id, feedback_id, parent_id, usuario_id, usuario_nome, conteudo)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id, feedback_id, parent_id, usuario_id, usuario_nome, conteudo,
                         to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at"#,
        )
        .bind(comment.id)
        .bind(comment.feedback_id)
        .bind(comment.parent_id)
        .bind(comment.usuario_id)
        .bind(&comment.usuario_nome)
        .bind(&comment.conteudo)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_by_feedback(&self, feedback_id: Uuid) -> Result<Vec<FeedbackComment>, String> {
        sqlx::query_as::<_, FeedbackComment>(
            r#"SELECT id, feedback_id, parent_id, usuario_id, usuario_nome, conteudo,
                      to_char(created_at - INTERVAL '3 hours', 'DD/MM/YYYY HH24:MI') AS created_at
               FROM feedback_comments
               WHERE feedback_id = $1
               ORDER BY created_at ASC"#,
        )
        .bind(feedback_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn delete(&self, id: Uuid, caller_id: Option<Uuid>) -> Result<(), String> {
        match caller_id {
            None => sqlx::query("DELETE FROM feedback_comments WHERE id = $1")
                .bind(id)
                .execute(&self.pool)
                .await
                .map(|_| ())
                .map_err(|e| e.to_string()),
            Some(uid) => sqlx::query("DELETE FROM feedback_comments WHERE id = $1 AND usuario_id = $2")
                .bind(id)
                .bind(uid)
                .execute(&self.pool)
                .await
                .map(|_| ())
                .map_err(|e| e.to_string()),
        }
    }
}
