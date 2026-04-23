require 'faraday'

class ApiClient
  COMPLETED_STATUSES = ["Entrega", "Homologação"].freeze
  IN_PROGRESS_STATUSES = ["Revisão Textual", "Estratégico", "Check-list", "Design/Conteúdo",
                          "Se necessário", "Identidade Visual", "Técnico", "Redação"].freeze

  CATEGORY_COLORS = {
    "1. PACTO pela Economia" => "blue",
    "2. TOOLKIT" => "teal",
    "3. APRESENTAÇÕES" => "orange",
    "4. INDICADORES" => "green",
    "5. PROJETOS INTERNOS" => "purple",
    "6. COMUNICAÇÃO" => "red",
    "7. EMPREENDEDOR" => "yellow"
  }.freeze

  def initialize
    @conn = Faraday.new(url: ENV.fetch("BACKEND_URL", "http://localhost:3001")) do |f|
      f.request :json
      f.response :json
    end
  end

  def tasks
    response = @conn.get('/api/tasks')
    enrich_tasks(response.body)
  rescue StandardError
    enrich_tasks(mock_data)
  end

  def self.status_group(status)
    if COMPLETED_STATUSES.include?(status)
      :done
    elsif IN_PROGRESS_STATUSES.include?(status)
      :in_progress
    else
      :pending
    end
  end

  def self.category_color(category)
    CATEGORY_COLORS.each do |key, color|
      return color if category.to_s.include?(key.split(". ").last)
    end
    "blue"
  end

  private

  def enrich_tasks(tasks)
    tasks.each_with_index do |task, i|
      task["id"] ||= (100 + i)
      task["status_group"] = self.class.status_group(task["status"])
      task["badge_color"] = self.class.category_color(task["category"])
    end
    tasks
  end

  def mock_data
    [
      { "category" => "1. PACTO pela Economia", "activity" => "Registrar visitas realizadas", "responsible" => "Equipe", "status" => "Definir Status" },
      { "category" => "1. PACTO pela Economia", "activity" => "Enviar relatório final para MV e Rebeca", "responsible" => "Gabriel", "status" => "Pendente" },
      { "category" => "5. PROJETOS INTERNOS", "activity" => "Revisar cronograma de entregas Q2", "responsible" => "Luís", "status" => "Agendar" },
      { "category" => "6. COMUNICAÇÃO", "activity" => "Preparar material para reunião de alinhamento", "responsible" => "Rebeca", "status" => "Pendente" },
      { "category" => "2. TOOLKIT", "activity" => "Revisar textos do site (caixas de texto)", "responsible" => "Equipe", "status" => "Revisão Textual" },
      { "category" => "3. APRESENTAÇÕES", "activity" => "Relatório de Gestão", "responsible" => "Ingrid", "status" => "Design/Conteúdo" },
      { "category" => "4. INDICADORES", "activity" => "Ajustar gráfico de linha e filtros", "responsible" => "Ingrid + Luís", "status" => "Técnico" },
      { "category" => "6. COMUNICAÇÃO", "activity" => "Atualizar identidade visual das redes sociais", "responsible" => "Ingrid", "status" => "Identidade Visual" },
      { "category" => "2. TOOLKIT", "activity" => "Desenvolver módulo de exportação de dados", "responsible" => "Luís", "status" => "Técnico" },
      { "category" => "3. APRESENTAÇÕES", "activity" => "Apresentação Gratty - CTD", "responsible" => "Ingrid", "status" => "Entrega" },
      { "category" => "7. EMPREENDEDOR", "activity" => "Testar IAI SIA", "responsible" => "Equipe", "status" => "Homologação" },
      { "category" => "5. PROJETOS INTERNOS", "activity" => "Migração do banco de dados legado", "responsible" => "Gabriel", "status" => "Entrega" },
      { "category" => "4. INDICADORES", "activity" => "Dashboard de métricas mensais", "responsible" => "Ingrid + Luís", "status" => "Entrega" }
    ]
  end
end
