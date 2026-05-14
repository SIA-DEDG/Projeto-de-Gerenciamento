use crate::domain::entities::{Task, Project};
use crate::domain::ports::{TaskRepository, ProjectRepository};
use async_trait::async_trait;
use sqlx::PgPool;
use std::sync::Mutex;

pub struct InMemoryTaskRepository {
    tasks: Mutex<Vec<Task>>,
    next_id: Mutex<i64>,
}

impl InMemoryTaskRepository {
    pub fn new() -> Self {
        let initial_tasks = vec![
            Task { id: 100, category: "1. PACTO pela Economia".to_string(), activity: "Registrar visitas realizadas".to_string(), responsible: "Equipe".to_string(), status: "Definir Status".to_string(), priority: "Média".to_string(), created_at: "2026-04-01".to_string() },
            Task { id: 101, category: "1. PACTO pela Economia".to_string(), activity: "Enviar relatório final para MV e Rebeca".to_string(), responsible: "Gabriel".to_string(), status: "Pendente".to_string(), priority: "Alta".to_string(), created_at: "2026-04-02".to_string() },
            Task { id: 102, category: "5. PROJETOS INTERNOS".to_string(), activity: "Revisar cronograma de entregas Q2".to_string(), responsible: "Luís".to_string(), status: "Agendar".to_string(), priority: "Alta".to_string(), created_at: "2026-04-03".to_string() },
            Task { id: 103, category: "6. COMUNICAÇÃO".to_string(), activity: "Preparar material para reunião de alinhamento".to_string(), responsible: "Rebeca".to_string(), status: "Pendente".to_string(), priority: "Média".to_string(), created_at: "2026-04-04".to_string() },
            Task { id: 104, category: "2. TOOLKIT".to_string(), activity: "Revisar textos do site (caixas de texto)".to_string(), responsible: "Equipe".to_string(), status: "Revisão Textual".to_string(), priority: "Média".to_string(), created_at: "2026-03-25".to_string() },
            Task { id: 105, category: "3. APRESENTAÇÕES".to_string(), activity: "Relatório de Gestão".to_string(), responsible: "Ingrid".to_string(), status: "Design/Conteúdo".to_string(), priority: "Alta".to_string(), created_at: "2026-03-28".to_string() },
            Task { id: 106, category: "4. INDICADORES".to_string(), activity: "Ajustar gráfico de linha e filtros".to_string(), responsible: "Ingrid + Luís".to_string(), status: "Técnico".to_string(), priority: "Alta".to_string(), created_at: "2026-03-30".to_string() },
            Task { id: 107, category: "6. COMUNICAÇÃO".to_string(), activity: "Atualizar identidade visual das redes sociais".to_string(), responsible: "Ingrid".to_string(), status: "Identidade Visual".to_string(), priority: "Média".to_string(), created_at: "2026-04-01".to_string() },
            Task { id: 108, category: "2. TOOLKIT".to_string(), activity: "Desenvolver módulo de exportação de dados".to_string(), responsible: "Luís".to_string(), status: "Técnico".to_string(), priority: "Alta".to_string(), created_at: "2026-04-05".to_string() },
            Task { id: 109, category: "3. APRESENTAÇÕES".to_string(), activity: "Apresentação Gratty - CTD".to_string(), responsible: "Ingrid".to_string(), status: "Entrega".to_string(), priority: "Alta".to_string(), created_at: "2026-03-20".to_string() },
            Task { id: 110, category: "7. EMPREENDEDOR".to_string(), activity: "Testar IAI SIA".to_string(), responsible: "Equipe".to_string(), status: "Homologação".to_string(), priority: "Crítica".to_string(), created_at: "2026-03-22".to_string() },
            Task { id: 111, category: "5. PROJETOS INTERNOS".to_string(), activity: "Migração do banco de dados legado".to_string(), responsible: "Gabriel".to_string(), status: "Entrega".to_string(), priority: "Crítica".to_string(), created_at: "2026-03-15".to_string() },
            Task { id: 112, category: "4. INDICADORES".to_string(), activity: "Dashboard de métricas mensais".to_string(), responsible: "Ingrid + Luís".to_string(), status: "Entrega".to_string(), priority: "Alta".to_string(), created_at: "2026-03-18".to_string() },
        ];

        Self { next_id: Mutex::new(113), tasks: Mutex::new(initial_tasks) }
    }
}

#[async_trait]
impl TaskRepository for InMemoryTaskRepository {
    async fn get_all_tasks(&self) -> Result<Vec<Task>, String> {
        let tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        Ok(tasks.clone())
    }

    async fn add_task(&self, mut task: Task) -> Result<Task, String> {
        let mut next_id = self.next_id.lock().map_err(|e| e.to_string())?;
        task.id = *next_id;
        *next_id += 1;
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        tasks.push(task.clone());
        Ok(task)
    }

    async fn get_task_by_id(&self, id: i64) -> Result<Option<Task>, String> {
        let tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        Ok(tasks.iter().find(|t| t.id == id).cloned())
    }

    async fn update_task(&self, task: Task) -> Result<Task, String> {
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        if let Some(existing) = tasks.iter_mut().find(|t| t.id == task.id) {
            *existing = task.clone();
            Ok(task)
        } else {
            Err(format!("Task com id {} não encontrada", task.id))
        }
    }

    async fn delete_task(&self, id: i64) -> Result<(), String> {
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        let initial_len = tasks.len();
        tasks.retain(|t| t.id != id);
        if tasks.len() < initial_len { Ok(()) } else { Err(format!("Task com id {} não encontrada", id)) }
    }
}

// ─── InMemoryProjectRepository ───────────────────────────────────────────────

pub struct InMemoryProjectRepository {
    projects: Mutex<Vec<Project>>,
    next_id: Mutex<i64>,
}

impl InMemoryProjectRepository {
    pub fn new() -> Self {
        Self {
            next_id: Mutex::new(1),
            projects: Mutex::new(vec![]),
        }
    }
}

#[async_trait]
impl ProjectRepository for InMemoryProjectRepository {
    async fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        let projects = self.projects.lock().map_err(|e| e.to_string())?;
        Ok(projects.clone())
    }

    async fn add_project(&self, mut project: Project) -> Result<Project, String> {
        let mut next_id = self.next_id.lock().map_err(|e| e.to_string())?;
        project.id = *next_id;
        *next_id += 1;
        let mut projects = self.projects.lock().map_err(|e| e.to_string())?;
        projects.push(project.clone());
        Ok(project)
    }

    async fn get_project_by_id(&self, id: i64) -> Result<Option<Project>, String> {
        let projects = self.projects.lock().map_err(|e| e.to_string())?;
        Ok(projects.iter().find(|p| p.id == id).cloned())
    }

    async fn update_project(&self, project: Project) -> Result<Project, String> {
        let mut projects = self.projects.lock().map_err(|e| e.to_string())?;
        if let Some(existing) = projects.iter_mut().find(|p| p.id == project.id) {
            *existing = project.clone();
            Ok(project)
        } else {
            Err(format!("Projeto com id {} não encontrado", project.id))
        }
    }

    async fn delete_project(&self, id: i64) -> Result<(), String> {
        let mut projects = self.projects.lock().map_err(|e| e.to_string())?;
        let initial_len = projects.len();
        projects.retain(|p| p.id != id);
        if projects.len() < initial_len { Ok(()) } else { Err(format!("Projeto com id {} não encontrado", id)) }
    }
}

// ─── PostgresTaskRepository ───────────────────────────────────────────────────

pub struct PostgresTaskRepository {
    pub pool: PgPool,
}

impl PostgresTaskRepository {
    pub async fn new(database_url: &str) -> Result<Self, String> {
        let pool = PgPool::connect(database_url).await.map_err(|e| e.to_string())?;
        let schema = include_str!("../../sql/schema.sql");
        sqlx::raw_sql(schema).execute(&pool).await.map_err(|e| e.to_string())?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl TaskRepository for PostgresTaskRepository {
    async fn get_all_tasks(&self) -> Result<Vec<Task>, String> {
        sqlx::query_as::<_, Task>(
            r#"SELECT id, category, activity, responsible, status, priority, to_char(created_at, 'YYYY-MM-DD') AS created_at
               FROM tasks ORDER BY id ASC"#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn add_task(&self, task: Task) -> Result<Task, String> {
        sqlx::query_as::<_, Task>(
            r#"INSERT INTO tasks (category, activity, responsible, status, priority, created_at)
               VALUES ($1, $2, $3, $4, $5, COALESCE(NULLIF($6, ''), to_char(now(), 'YYYY-MM-DD'))::date)
               RETURNING id, category, activity, responsible, status, priority, to_char(created_at, 'YYYY-MM-DD') AS created_at"#
        )
        .bind(task.category)
        .bind(task.activity)
        .bind(task.responsible)
        .bind(task.status)
        .bind(task.priority)
        .bind(task.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_task_by_id(&self, id: i64) -> Result<Option<Task>, String> {
        sqlx::query_as::<_, Task>(
            r#"SELECT id, category, activity, responsible, status, priority, to_char(created_at, 'YYYY-MM-DD') AS created_at
               FROM tasks WHERE id = $1"#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn update_task(&self, task: Task) -> Result<Task, String> {
        sqlx::query_as::<_, Task>(
            r#"UPDATE tasks
               SET category = $2, activity = $3, responsible = $4, status = $5, priority = $6, created_at = COALESCE(NULLIF($7, ''), to_char(now(), 'YYYY-MM-DD'))::date
               WHERE id = $1
               RETURNING id, category, activity, responsible, status, priority, to_char(created_at, 'YYYY-MM-DD') AS created_at"#
        )
        .bind(task.id)
        .bind(task.category)
        .bind(task.activity)
        .bind(task.responsible)
        .bind(task.status)
        .bind(task.priority)
        .bind(task.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn delete_task(&self, id: i64) -> Result<(), String> {
        let result = sqlx::query("DELETE FROM tasks WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if result.rows_affected() == 0 { Err(format!("Task com id {} não encontrada", id)) } else { Ok(()) }
    }
}

// ─── PostgresProjectRepository ────────────────────────────────────────────────

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
        sqlx::query_as::<_, Project>(
            r#"SELECT id, name, category, owner, deadline::text, executive_status, objective, scope, summary
               FROM projects ORDER BY id ASC"#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn add_project(&self, project: Project) -> Result<Project, String> {
        sqlx::query_as::<_, Project>(
            r#"INSERT INTO projects (name, category, owner, deadline, executive_status, objective, scope, summary)
               VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)
               RETURNING id, name, category, owner, deadline::text, executive_status, objective, scope, summary"#
        )
        .bind(project.name)
        .bind(project.category)
        .bind(project.owner)
        .bind(project.deadline)
        .bind(project.executive_status)
        .bind(project.objective)
        .bind(project.scope)
        .bind(project.summary)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn get_project_by_id(&self, id: i64) -> Result<Option<Project>, String> {
        sqlx::query_as::<_, Project>(
            r#"SELECT id, name, category, owner, deadline::text, executive_status, objective, scope, summary
               FROM projects WHERE id = $1"#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn update_project(&self, project: Project) -> Result<Project, String> {
        sqlx::query_as::<_, Project>(
            r#"UPDATE projects
               SET name = $2, category = $3, owner = $4, deadline = $5::date,
                   executive_status = $6, objective = $7, scope = $8, summary = $9,
                   updated_at = NOW()
               WHERE id = $1
               RETURNING id, name, category, owner, deadline::text, executive_status, objective, scope, summary"#
        )
        .bind(project.id)
        .bind(project.name)
        .bind(project.category)
        .bind(project.owner)
        .bind(project.deadline)
        .bind(project.executive_status)
        .bind(project.objective)
        .bind(project.scope)
        .bind(project.summary)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }

    async fn delete_project(&self, id: i64) -> Result<(), String> {
        let result = sqlx::query("DELETE FROM projects WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        if result.rows_affected() == 0 { Err(format!("Projeto com id {} não encontrado", id)) } else { Ok(()) }
    }
}
