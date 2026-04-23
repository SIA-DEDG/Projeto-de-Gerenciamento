window.AppStore = (function() {
  const STORAGE_KEY = 'sia_board_tasks_v1';
  const CATEGORIES_KEY = 'sia_categories_v1';

  // Mock initial data if empty
  const defaultTasks = [
    { id: 101, category: "1. PACTO pela Economia", activity: "Registrar visitas realizadas", responsible: "Equipe", status: "Definir Status", status_group: "pending", badge_color: "blue", date: "2026-04-05" },
    { id: 102, category: "1. PACTO pela Economia", activity: "Enviar relatório final para MV e Rebeca", responsible: "Gabriel", status: "Pendente", status_group: "pending", badge_color: "blue", date: "2026-04-12" },
    { id: 103, category: "5. PROJETOS INTERNOS", activity: "Revisar cronograma de entregas Q2", responsible: "Luís", status: "Agendar", status_group: "pending", badge_color: "purple", date: "2026-04-15" },
    { id: 104, category: "6. COMUNICAÇÃO", activity: "Preparar material para reunião de alinhamento", responsible: "Rebeca", status: "Pendente", status_group: "pending", badge_color: "red", date: "2026-04-08" },
    { id: 105, category: "2. TOOLKIT", activity: "Revisar textos do site (caixas de texto)", responsible: "Equipe", status: "Revisão Textual", status_group: "in_progress", badge_color: "teal", date: "2026-04-20" },
    { id: 106, category: "3. APRESENTAÇÕES", activity: "Relatório de Gestão", responsible: "Ingrid", status: "Design/Conteúdo", status_group: "in_progress", badge_color: "orange", date: "2026-04-18" },
    { id: 107, category: "4. INDICADORES", activity: "Ajustar gráfico de linha e filtros", responsible: "Ingrid + Luís", status: "Técnico", status_group: "in_progress", badge_color: "green", date: "2026-04-22" },
    { id: 108, category: "6. COMUNICAÇÃO", activity: "Atualizar identidade visual das redes sociais", responsible: "Ingrid", status: "Identidade Visual", status_group: "in_progress", badge_color: "red", date: "2026-04-25" },
    { id: 109, category: "2. TOOLKIT", activity: "Desenvolver módulo de exportação de dados", responsible: "Luís", status: "Técnico", status_group: "in_progress", badge_color: "teal", date: "2026-04-28" },
    { id: 110, category: "3. APRESENTAÇÕES", activity: "Apresentação Gratty - CTD", responsible: "Ingrid", status: "Entrega", status_group: "done", badge_color: "orange", date: "2026-04-10" },
    { id: 111, category: "7. EMPREENDEDOR", activity: "Testar IAI SIA", responsible: "Equipe", status: "Homologação", status_group: "done", badge_color: "yellow", date: "2026-04-14" },
    { id: 112, category: "5. PROJETOS INTERNOS", activity: "Migração do banco de dados legado", responsible: "Gabriel", status: "Entrega", status_group: "done", badge_color: "purple", date: "2026-04-02" },
    { id: 113, category: "4. INDICADORES", activity: "Dashboard de métricas mensais", responsible: "Ingrid + Luís", status: "Entrega", status_group: "done", badge_color: "green", date: "2026-04-30" }
  ];

  const defaultCategories = [
    { name: "1. PACTO pela Economia", color: "blue" },
    { name: "2. TOOLKIT", color: "teal" },
    { name: "3. APRESENTAÇÕES", color: "orange" },
    { name: "4. INDICADORES", color: "green" },
    { name: "5. PROJETOS INTERNOS", color: "purple" },
    { name: "6. COMUNICAÇÃO", color: "red" },
    { name: "7. EMPREENDEDOR", color: "yellow" }
  ];

  function getTasks() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultTasks;
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function getCategories() {
    const data = localStorage.getItem(CATEGORIES_KEY);
    return data ? JSON.parse(data) : defaultCategories;
  }

  function saveCategories(cats) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  }

  return {
    getTasks,
    saveTasks,
    getCategories,
    saveCategories,
    
    addTask: function(task) {
      const tasks = getTasks();
      task.id = Date.now();
      tasks.push(task);
      saveTasks(tasks);
      return task;
    },

    updateTask: function(id, updatedFields) {
      const tasks = getTasks();
      const index = tasks.findIndex(t => t.id == id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updatedFields };
        saveTasks(tasks);
        return tasks[index];
      }
      return null;
    },

    deleteTask: function(id) {
      const tasks = getTasks();
      const filtered = tasks.filter(t => t.id != id);
      saveTasks(filtered);
    },

    addCategory: function(name, color) {
      const cats = getCategories();
      if (!cats.find(c => c.name === name)) {
        cats.push({ name, color });
        saveCategories(cats);
      }
    },

    deleteCategory: function(name) {
      const cats = getCategories();
      saveCategories(cats.filter(c => c.name !== name));
    }
  };
})();
