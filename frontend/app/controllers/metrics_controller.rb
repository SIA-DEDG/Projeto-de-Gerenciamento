class MetricsController < ApplicationController
  def index
    api_client = ApiClient.new
    @tasks = api_client.tasks || []

    @pending_count     = @tasks.count { |t| t["status_group"] == :pending }
    @in_progress_count = @tasks.count { |t| t["status_group"] == :in_progress }
    @completed_count   = @tasks.count { |t| t["status_group"] == :done }
    @total_count       = @tasks.count

    # Data for category breakdown chart
    @categories = @tasks.group_by { |t| t["category"] }
                        .map { |cat, items| { name: cat.gsub(/^\d+\.\s*/, ''), count: items.size } }
                        .sort_by { |c| -c[:count] }
  end
end
