Rails.application.routes.draw do
  root "dashboard#index"

  get "dashboards", to: "metrics#index", as: :metrics
  get "reports", to: "reports#index", as: :reports
end
