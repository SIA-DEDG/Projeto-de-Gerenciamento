class DashboardController < ApplicationController
  def index
    api_client = ApiClient.new
    all_tasks = api_client.tasks || []

    @pending_tasks     = all_tasks.select { |t| t["status_group"] == :pending }
    @in_progress_tasks = all_tasks.select { |t| t["status_group"] == :in_progress }
    @done_tasks        = all_tasks.select { |t| t["status_group"] == :done }
  end
end
