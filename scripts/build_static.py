import os
import re
import shutil

# Resolve project root (one level up from scripts/)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# Copy assets to root (needed by the generated HTML files)
shutil.copyfile('frontend/public/store.js', 'store.js')
shutil.copyfile('frontend/public/sortable.min.js', 'sortable.min.js')
shutil.copyfile('frontend/app/assets/stylesheets/application.css', 'application.css')

# Read ERB source templates
with open('frontend/app/views/layouts/application.html.erb', 'r', encoding='utf-8') as f:
    layout = f.read()
with open('frontend/app/views/dashboard/index.html.erb', 'r', encoding='utf-8') as f:
    dashboard = f.read()
with open('frontend/app/views/metrics/index.html.erb', 'r', encoding='utf-8') as f:
    metrics = f.read()
with open('frontend/app/views/reports/index.html.erb', 'r', encoding='utf-8') as f:
    reports = f.read()

# Rewrite asset paths in layout
layout = layout.replace('/assets/application.css', './application.css')
layout = layout.replace('/sortable.min.js', './sortable.min.js')
layout = layout.replace('/store.js', './store.js')


def build_page(layout, content, active_page, title):
    html = layout

    # Resolve active nav classes
    pages = {'board': 'root_path', 'metrics': 'metrics_path', 'reports': 'reports_path'}
    for page, path_helper in pages.items():
        active = 'active' if page == active_page else ''
        html = html.replace(
            f"<%= current_page?({path_helper}) ? 'active' : '' %>", active
        )

    # Resolve nav links
    html = html.replace("<%= link_to root_path, class: 'nav-link' do %>", '<a href="index.html" class="nav-link">')
    html = html.replace("<%= link_to metrics_path, class: 'nav-link' do %>", '<a href="dashboards.html" class="nav-link">')
    html = html.replace("<%= link_to reports_path, class: 'nav-link' do %>", '<a href="relatorios.html" class="nav-link">')
    html = html.replace('<% end %>', '</a>')

    # Resolve page title
    html = html.replace("<%= content_for?(:page_title) ? yield(:page_title) : 'Board' %>", title)

    # Strip content_for directive from first line of content
    content_lines = content.split('\n')
    if '<% content_for(:page_title' in content_lines[0]:
        content = '\n'.join(content_lines[1:])

    html = html.replace('<%= yield %>', content)

    # Remove any remaining ERB tags
    html = re.sub(r'<%= .*? %>', '', html)

    return html


# Generate static pages
pages = [
    ('index.html',      dashboard, 'board',   'Board'),
    ('dashboards.html', metrics,   'metrics',  'Dashboards'),
    ('relatorios.html', reports,   'reports',  'Relatórios'),
]

for filename, content, page, title in pages:
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(build_page(layout, content, page, title))
    print(f'  ✓ {filename}')

print('\nBuild concluído com sucesso!')
