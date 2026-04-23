use crate::domain::entities::Task;
use crate::domain::ports::TaskRepository;
use std::sync::Mutex;

pub struct InMemoryTaskRepository {
    tasks: Mutex<Vec<Task>>,
    next_id: Mutex<u32>,
}

impl InMemoryTaskRepository {
    pub fn new() -> Self {
        let initial_tasks = vec![
            // ── Pendentes ──
            Task {
                id: 100,
                category: "1. PACTO pela Economia".to_string(),
                activity: "Registrar visitas realizadas".to_string(),
                responsible: "Equipe".to_string(),
                status: "Definir Status".to_string(),
                priority: "Média".to_string(),
                created_at: "2026-04-01".to_string(),
            },
            Task {
                id: 101,
                category: "1. PACTO pela Economia".to_string(),
                activity: "Enviar relatório final para MV e Rebeca".to_string(),
                responsible: "Gabriel".to_string(),
                status: "Pendente".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-04-02".to_string(),
            },
            Task {
                id: 102,
                category: "5. PROJETOS INTERNOS".to_string(),
                activity: "Revisar cronograma de entregas Q2".to_string(),
                responsible: "Luís".to_string(),
                status: "Agendar".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-04-03".to_string(),
            },
            Task {
                id: 103,
                category: "6. COMUNICAÇÃO".to_string(),
                activity: "Preparar material para reunião de alinhamento".to_string(),
                responsible: "Rebeca".to_string(),
                status: "Pendente".to_string(),
                priority: "Média".to_string(),
                created_at: "2026-04-04".to_string(),
            },
            // ── Em Andamento ──
            Task {
                id: 104,
                category: "2. TOOLKIT".to_string(),
                activity: "Revisar textos do site (caixas de texto)".to_string(),
                responsible: "Equipe".to_string(),
                status: "Revisão Textual".to_string(),
                priority: "Média".to_string(),
                created_at: "2026-03-25".to_string(),
            },
            Task {
                id: 105,
                category: "3. APRESENTAÇÕES".to_string(),
                activity: "Relatório de Gestão".to_string(),
                responsible: "Ingrid".to_string(),
                status: "Design/Conteúdo".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-03-28".to_string(),
            },
            Task {
                id: 106,
                category: "4. INDICADORES".to_string(),
                activity: "Ajustar gráfico de linha e filtros".to_string(),
                responsible: "Ingrid + Luís".to_string(),
                status: "Técnico".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-03-30".to_string(),
            },
            Task {
                id: 107,
                category: "6. COMUNICAÇÃO".to_string(),
                activity: "Atualizar identidade visual das redes sociais".to_string(),
                responsible: "Ingrid".to_string(),
                status: "Identidade Visual".to_string(),
                priority: "Média".to_string(),
                created_at: "2026-04-01".to_string(),
            },
            Task {
                id: 108,
                category: "2. TOOLKIT".to_string(),
                activity: "Desenvolver módulo de exportação de dados".to_string(),
                responsible: "Luís".to_string(),
                status: "Técnico".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-04-05".to_string(),
            },
            // ── Concluídos / Entregas ──
            Task {
                id: 109,
                category: "3. APRESENTAÇÕES".to_string(),
                activity: "Apresentação Gratty – CTD".to_string(),
                responsible: "Ingrid".to_string(),
                status: "Entrega".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-03-20".to_string(),
            },
            Task {
                id: 110,
                category: "7. EMPREENDEDOR".to_string(),
                activity: "Testar IAI SIA".to_string(),
                responsible: "Equipe".to_string(),
                status: "Homologação".to_string(),
                priority: "Crítica".to_string(),
                created_at: "2026-03-22".to_string(),
            },
            Task {
                id: 111,
                category: "5. PROJETOS INTERNOS".to_string(),
                activity: "Migração do banco de dados legado".to_string(),
                responsible: "Gabriel".to_string(),
                status: "Entrega".to_string(),
                priority: "Crítica".to_string(),
                created_at: "2026-03-15".to_string(),
            },
            Task {
                id: 112,
                category: "4. INDICADORES".to_string(),
                activity: "Dashboard de métricas mensais".to_string(),
                responsible: "Ingrid + Luís".to_string(),
                status: "Entrega".to_string(),
                priority: "Alta".to_string(),
                created_at: "2026-03-18".to_string(),
            },
        ];

        Self {
            next_id: Mutex::new(113),
            tasks: Mutex::new(initial_tasks),
        }
    }
}

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

    async fn get_task_by_id(&self, id: u32) -> Result<Option<Task>, String> {
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

    async fn delete_task(&self, id: u32) -> Result<(), String> {
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        let initial_len = tasks.len();
        tasks.retain(|t| t.id != id);
        if tasks.len() < initial_len {
            Ok(())
        } else {
            Err(format!("Task com id {} não encontrada", id))
        }
    }
}
