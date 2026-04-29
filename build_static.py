import os
import shutil

# Copy assets
shutil.copyfile('frontend/public/store.js', 'store.js')
shutil.copyfile('frontend/public/sortable.min.js', 'sortable.min.js')
shutil.copyfile('frontend/app/assets/stylesheets/application.css', 'application.css')

# Read sources
with open('frontend/app/views/layouts/application.html.erb', 'r', encoding='utf-8') as f:
    layout = f.read()

with open('frontend/app/views/dashboard/index.html.erb', 'r', encoding='utf-8') as f:
    dashboard = f.read()

with open('frontend/app/views/metrics/index.html.erb', 'r', encoding='utf-8') as f:
    metrics = f.read()

with open('frontend/app/views/reports/index.html.erb', 'r', encoding='utf-8') as f:
    reports = f.read()

# Base cleanup
layout = layout.replace('/assets/application.css', './application.css')
layout = layout.replace('/sortable.min.js', './sortable.min.js')
layout = layout.replace('/store.js', './store.js')

def build_page(layout, content, active_page, title):
    html = layout

    # Navigation logic
    # Find the block where `root_path`, `metrics_path`, `reports_path` are defined.
    # We will just replace the exact substrings.
    
    # 1. active classes
    if active_page == 'board':
        html = html.replace('<%= current_page?(root_path) ? \'active\' : \'\' %>', 'active')
        html = html.replace('<%= current_page?(metrics_path) ? \'active\' : \'\' %>', '')
        html = html.replace('<%= current_page?(reports_path) ? \'active\' : \'\' %>', '')
    elif active_page == 'metrics':
        html = html.replace('<%= current_page?(root_path) ? \'active\' : \'\' %>', '')
        html = html.replace('<%= current_page?(metrics_path) ? \'active\' : \'\' %>', 'active')
        html = html.replace('<%= current_page?(reports_path) ? \'active\' : \'\' %>', '')
    elif active_page == 'reports':
        html = html.replace('<%= current_page?(root_path) ? \'active\' : \'\' %>', '')
        html = html.replace('<%= current_page?(metrics_path) ? \'active\' : \'\' %>', '')
        html = html.replace('<%= current_page?(reports_path) ? \'active\' : \'\' %>', 'active')

    # 2. link URLs
    html = html.replace('<%= link_to root_path, class: \'nav-link\' do %>', '<a href="index.html" class="nav-link">')
    html = html.replace('<%= link_to metrics_path, class: \'nav-link\' do %>', '<a href="dashboards.html" class="nav-link">')
    html = html.replace('<%= link_to reports_path, class: \'nav-link\' do %>', '<a href="relatorios.html" class="nav-link">')
    html = html.replace('<% end %>', '</a>')

    # 3. page title
    html = html.replace('<%= content_for?(:page_title) ? yield(:page_title) : \'Board\' %>', title)

    # remove the content_for(:page_title, ...) from content
    content_lines = content.split('\n')
    if '<% content_for(:page_title' in content_lines[0]:
        content = '\n'.join(content_lines[1:])
        
    html = html.replace('<%= yield %>', content)
    
    # remove ruby tags if any are left
    import re
    html = re.sub(r'<%= .*? %>', '', html)
    
    return html

# Write index.html (Board)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(build_page(layout, dashboard, 'board', 'Board'))

# Write dashboards.html (Metrics)
with open('dashboards.html', 'w', encoding='utf-8') as f:
    f.write(build_page(layout, metrics, 'metrics', 'Dashboards'))

# Write relatorios.html (Reports)
with open('relatorios.html', 'w', encoding='utf-8') as f:
    f.write(build_page(layout, reports, 'reports', 'Relatórios'))

print("All static pages built!")
