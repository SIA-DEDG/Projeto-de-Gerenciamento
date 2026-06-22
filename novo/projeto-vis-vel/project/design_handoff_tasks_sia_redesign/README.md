# Handoff: Redesign do Tasks SIA (Sistema de Gestão da DEDG)

## Visão geral
Redesign completo da interface do sistema de gestão de atividades da **DEDG — Diretoria de Economia Digital e Governança (SIA, Governo do Piauí)**. O objetivo foi sair de um visual genérico de SaaS ("cara de IA") para uma identidade **sóbria, técnica e institucional**, com personalidade própria e a marca azul do Governo do Piauí, mantendo clareza para uso diário.

Repositório alvo: `SIA-DEDG/Projeto-de-Gerenciamento` → app em **Next.js** (`frontend-next/`, App Router, React client components, CSS modules + `globals.css`).

## Sobre os arquivos deste pacote
Os arquivos `Tasks SIA.dc.html` e `Calendario.dc.html` são **referências de design feitas em HTML** (protótipos navegáveis que mostram aparência e comportamento pretendidos) — **não** são código de produção para copiar e colar. Eles usam um runtime de protótipo (`support.js`) e estilos inline.

A tarefa é **recriar esses designs no codebase existente (Next.js/React)**, usando os padrões já estabelecidos do projeto (componentes em `src/components`, páginas em `src/app/(app)`, tokens em `globals.css`). Abra os `.dc.html` em um navegador para ver o resultado final e interagir (tela de login → botão **Entrar**).

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos e interações são finais. Recriar a UI fielmente, adaptando aos componentes/bibliotecas do codebase. As telas que hoje existem no app devem adotar este sistema; o que mudou de verdade é a **linguagem visual** (tokens, tipografia, ausência de cards, cor por status, tema escuro), não a arquitetura de dados.

---

## Sistema visual (Design Tokens)

### Tipografia
- **Família principal:** `IBM Plex Sans` (pesos 400/500/600/700).
- **Mono (rótulos técnicos, números, datas, IDs, contadores, status):** `IBM Plex Mono` (400/500/600). Classe utilitária `.mono`.
- Títulos de página: 1.65rem / weight 600 / letter-spacing -0.7px.
- Eyebrow (sobre-título): mono, .68rem, uppercase, letter-spacing 1.4px, cor `--text-3`.
- > **Observação institucional:** o Manual de Identidade do Gov-PI especifica **Montserrat**. Este redesign adota IBM Plex (Sans+Mono) pela precisão "técnica/suíça" pedida. Se for obrigatório manter Montserrat, substitua **IBM Plex Sans → Montserrat** e mantenha **IBM Plex Mono** nos rótulos/números (o contraste sans+mono é parte essencial da identidade).

### Cores — tokens semânticos (CSS variables)
O tema é controlado por variáveis CSS. Tema claro em `:root`, escuro na classe `.theme-dark` aplicada no contêiner raiz.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0e131a` | fundo da página |
| `--surface` | `#ffffff` | `#141a22` | sidebar, cards, header, inputs |
| `--surface-2` | `#f9fafb` | `#1b222c` | hover, faixas, células de hoje/selecionado |
| `--line-1` | `#ececef` | `#283341` | divisórias principais (hairlines) |
| `--line-2` | `#f1f1f3` | `#222b36` | divisórias internas/linhas de lista |
| `--border` | `#e1e3e7` | `#2e3947` | bordas de inputs/botões/segmented |
| `--text` | `#11161D` | `#e9ecf0` | texto forte |
| `--text-2` | `#6b7280` | `#a6aeba` | texto secundário |
| `--text-3` | `#9aa1ac` | `#717a88` | rótulos mono, texto terciário |

### Cores de marca / acento (iguais nos dois temas)
- **Azul institucional (primária):** `#034EA2` (hover `#023e82`). Botões primários, links, item de nav ativo, réguas, barras de progresso.
- **Navy (marca/avatares):** `#072f63` (quadradinho do logo ★, avatares de iniciais — sempre brancos sobre navy).
- **Acentos de status (cor com significado):**
  - Pendente: `#9aa1ac` (cinza)
  - Em andamento: `#034EA2` (azul)
  - **Em revisão: `#E0A92E`** (dourado da bandeira) — coluna nova do fluxo
  - Concluído: `#1B8A4B` (verde) / texto verde `#157F3C`
  - Atraso/erro: `#b42318` (vermelho — usado **só** para atraso/recusa/excluir)
  - Dourado de rótulo (texto): `#A87A00`

### Forma e espaçamento
- **Sem cards/caixas com sombra.** Hierarquia por tipografia, espaço e **fios finos (hairlines) de 1px**. Listas e colunas separadas por linhas, não por contêineres.
- **Border-radius máximo 3px** (botões, inputs, segmented, avatares). Nada de cantos muito arredondados. Exceções: avatares 3px, toggle switch (pill, é controle funcional).
- Régua de destaque sob títulos: barra azul 2px × 36px.
- Padrão de seção/tela: padding 26px 32px no topo; conteúdo com hairlines.

### Ícones
- **Lucide** (line icons), traço ~1.8, monocromáticos, herdando `currentColor`. **Nunca emoji.** Nada de ícones coloridos/bolinhas decorativas.

---

## Navegação / Shell
- **Sidebar** (228px, `--surface`, borda direita): logo ★ (navy) + "Tasks SIA / DEDG · GOV-PI". Grupos: **PLANEJAMENTO** (Atividades, Minhas atividades [badge], Eventos, Faltas), **ANÁLISE** (Dashboards, Projetos, Logs), **SISTEMA** (Configurações, Feedback). Item ativo: texto azul, weight 600, fundo `--surface-2`, barra azul 2px à esquerda (`inset 2px 0 0 #034EA2`).
- **Rodapé da sidebar:** botão "Alternar tema" (ícone lua) + bloco do usuário (avatar navy, nome, cargo, sair).
- **Header de cada tela:** eyebrow (mono) + título + régua azul. **Botões de criar NÃO ficam no header** — ficam na barra de controles/toolbar de cada tela (à direita) ou como linha de adicionar na lista.

## Telas / Views

1. **Login** — painel esquerdo navy `#072f63` (listras sutis, marca, headline) + formulário à direita (inputs hairline, botão "Entrar" azul). 
2. **Atividades / Minhas atividades** — toggle no header **Quadro · Lista · Calendário**; busca + filtros (Responsável/Prioridade/Projeto); botão "Nova atividade" à direita da toolbar.
   - **Quadro (Kanban):** 4 colunas separadas por hairline vertical — **Pendente · Em andamento · Em revisão · Concluído**. Atividades são **linhas** (não cards) separadas por hairline, com fio lateral 2px na cor do status, categoria+prioridade em mono, projeto, avatares, prazo (mono, vermelho se atrasado). Drag-and-drop entre colunas. Botão "Adicionar" no rodapé de cada coluna.
   - **Lista:** tabela com grid (Atividade · Projeto · Prioridade · Status · Prazo).
   - **Calendário:** componente reutilizável (ver abaixo).
   - **Drawer de detalhe** (440px, direita): status, prioridade, projeto, prazo, responsáveis, descrição, ação de avançar status.
3. **Eventos** — sub-abas **Agenda · Atas de reunião · Calendário**. Agenda agrupada (Agendados/Realizados): bloco de data (mono) + tipo/status + título + horário/modalidade + avatares + selo de ata (verde "anexada" / dourado "pendente"). **Drawer do evento** permite **anexar/remover ata (.pdf)**. Sub-aba "Atas" lista todas as atas.
4. **Faltas** — faixa de resumo (Registros/Aprovadas/Pendentes/Servidores, números mono coloridos) + toggle **Lista · Calendário**. Tabela por servidor (avatar, tipo, período, justificativa) com **aprovação inline** (Aprovar/Recusar) para pendentes; status colorido (verde/dourado/vermelho).
5. **Dashboards** — faixa de KPIs (mono, "Concluídas" verde, "Atrasadas" vermelho); barra de distribuição por status (4 segmentos); barras por projeto; lista de prazos próximos. Sem cards com sombra.
6. **Projetos** — lista editorial (hairline): nome + ponto de status, descrição, status mono, avatares, barra de progresso azul, nº de atividades. Linha "Novo projeto" ao final.
7. **Logs** — feed de auditoria: grid `tempo(mono) · ator+ação+alvo · tipo(mono colorido)`. Tipos: Concluiu(verde), Editou/Criou(azul), Anexou/Registrou(dourado), Excluiu(vermelho), Acesso(cinza).
8. **Configurações** — seções com hairline: **Perfil** (nome/e-mail/cargo), **Aparência** (Tema: segmented **Claro/Escuro** funcional; Cor de destaque), **Notificações** (toggles/switches funcionais), **Conta** (sair). 
9. **Feedback** — formulário: tipo (segmented Sugestão/Problema/Dúvida), assunto (input), mensagem (textarea), enviar; lista de "Enviados".

### Componente Calendário (reutilizado em Atividades, Minhas, Eventos, Faltas)
- Toolbar: segmented **Mês/Semana**, navegação ‹ ›, rótulo do período (mono), botão **Hoje** (hoje = 2026-06-19 no protótipo).
- **Mês:** grade 7 colunas, cabeçalho de dias (mono), célula com número do dia (hoje = círculo azul), até 3 "chips" coloridos por status (borda esquerda na cor + título + responsável) e "+N ver mais"; **clique no dia abre painel** com os itens daquele dia.
- **Semana:** 7 colunas altas com cards por dia.
- Legenda no rodapé (varia por tela: status de atividade / agendado-realizado / aprovada-pendente-recusada). Itens com período (licença, férias) ocupam vários dias.
- Clique no item abre o drawer correspondente (atividade/evento).

## Interações & comportamento
- Drag-and-drop de atividades entre colunas (atualiza status).
- Filtros (responsável, prioridade, projeto) + busca textual; "Limpar".
- Toggles de visão (Quadro/Lista/Calendário; Agenda/Atas/Calendário; Lista/Calendário).
- Anexar/remover ata em eventos; aprovar/recusar faltas; enviar feedback.
- **Tema claro/escuro** com persistência em `localStorage` (chave `sia-theme`), alternável pela sidebar e por Configurações → Aparência. Aplicar a classe `.theme-dark` no contêiner raiz para trocar os tokens.
- Transições suaves de hover; drawer com slide-in (~0.24s, cubic-bezier(.4,0,.2,1)).

## Estado (no protótipo)
nav atual; visão por tela (kanban/lista/calendar, agenda/atas/calendar, lista/calendar); filtros/busca; item selecionado (drawer); lista de tarefas/eventos/faltas (mutáveis); estado do calendário (mês/semana, período, dia selecionado); tema; notificações; formulário de feedback. Numa app real, isso vira estado de página/React + chamadas à API existente (`@/lib/api`).

## Como implementar com Claude Code
1. Trabalhe dentro de `frontend-next/`. Reaproveite a estrutura atual (`src/app/(app)/...`, `src/components/...`).
2. Migre os tokens para `globals.css`: defina as CSS variables de tema (`:root` claro e `[data-theme="dark"]` ou `.theme-dark` escuro) e troque os valores hardcoded por `var(--token)`. Carregue IBM Plex Sans + Mono (ou Montserrat + Plex Mono, se preferir manter o manual).
3. Recrie tela a tela seguindo a seção **Telas** (comece por Atividades/Kanban e o Calendário, que são o núcleo). Mantenha a lógica/serviços existentes; troque só a camada visual.
4. Implemente o toggle de tema com persistência (`localStorage`), aplicando o atributo/classe de tema na raiz do app.
5. Use os `.dc.html` abertos no navegador como referência pixel-a-pixel (claro e escuro).

## Arquivos neste pacote
- `Tasks SIA.dc.html` — app completo (todas as telas, ambos os temas).
- `Calendario.dc.html` — componente de calendário reutilizável.
- `support.js` — runtime do protótipo (apenas para abrir os HTML; não portar).
