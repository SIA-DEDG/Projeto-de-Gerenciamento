class ReportsController < ApplicationController
  def index
    api_client = ApiClient.new
    @tasks = api_client.tasks || []
  end
end
