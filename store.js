// =============================================
// AppStore — Supabase REST API + localStorage fallback
// Projeto: SIA Gestão | mcygzegyitbamngfcrux
// =============================================
window.AppStore = (function () {
  // ── Supabase config ──────────────────────────────────────────────
  var SUPA_URL  = 'https://tvmbgcagmrzhqpdgwkur.supabase.co';
  var SUPA_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bWJnY2FnbXJ6aHFwZGd3a3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTQwNjgsImV4cCI6MjA5MjIzMDA2OH0.1qaqTaite0ehzZZUl86NNwkVoqdwdxtz5tDIb8lP7wc';

  // ── localStorage keys (fallback) ────────────────────────────────
  var STORAGE_KEY    = 'sia_board_tasks_v2_supa';
  var CATEGORIES_KEY = 'sia_categories_v1';
  var SYNC_FLAG      = 'sia_supa_synced';

  // ── Category color map ───────────────────────────────────────────
  var CATEGORY_COLORS = {
    'PACTO pela Economia': 'blue',
    'TOOLKIT':             'teal',
    'APRESENTAÇÕES':       'orange',
    'INDICADORES':         'green',
    'PROJETOS INTERNOS':   'purple',
    'COMUNICAÇÃO':         'red',
    'EMPREENDEDOR':        'yellow',
    'REPRESENTAÇÃO INSTITUCIONAL': 'blue',
    'CAPACITIA':           'teal',
    'EDUCAÇÃO E INOVAÇÃO': 'green'
  };

  var COMPLETED_STATUSES   = ['Entrega', 'Homologação', 'Concluído'];
  var IN_PROGRESS_STATUSES = ['Revisão Textual', 'Estratégico', 'Check-list',
    'Design/Conteúdo', 'Se necessário', 'Identidade Visual', 'Técnico', 'Redação',
    'Em Andamento'];

  // ── Default categories (always available) ────────────────────────
  var defaultCategories = [
    { name: '1. PACTO pela Economia',        color: 'blue'   },
    { name: '2. TOOLKIT',                    color: 'teal'   },
    { name: '3. APRESENTAÇÕES',              color: 'orange' },
    { name: '4. INDICADORES',               color: 'green'  },
    { name: '5. PROJETOS INTERNOS',          color: 'purple' },
    { name: '6. COMUNICAÇÃO',               color: 'red'    },
    { name: '7. EMPREENDEDOR',              color: 'yellow' },
    { name: '8. REPRESENTAÇÃO INSTITUCIONAL', color: 'blue'  },
    { name: '9. CAPACITIA',                  color: 'teal'   },
    { name: '10. EDUCAÇÃO E INOVAÇÃO',       color: 'green'  }
  ];

  // ── Helpers ───────────────────────────────────────────────────────
  function supaHeaders() {
    return {
      'Content-Type':  'application/json',
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Prefer':        'return=representation'
    };
  }

  function statusGroup(status) {
    if (COMPLETED_STATUSES.indexOf(status) !== -1)   return 'done';
    if (IN_PROGRESS_STATUSES.indexOf(status) !== -1) return 'in_progress';
    return 'pending';
  }

  function categoryColor(category) {
    for (var key in CATEGORY_COLORS) {
      if (category && category.indexOf(key) !== -1) return CATEGORY_COLORS[key];
    }
    return 'blue';
  }

  function enrichTask(t) {
    var sg = statusGroup(t.status || '');
    return {
      id:           t.id,
      category:     t.category     || '',
      activity:     t.activity     || '',
      responsible:  t.responsible  || '',
      status:       t.status       || 'Pendente',
      priority:     t.priority     || 'Média',
      date:         t.created_at   || '',
      status_group: sg,
      badge_color:  categoryColor(t.category || '')
    };
  }

  function statusLabelToDb(statusGroup) {
    var map = { pending: 'Pendente', in_progress: 'Em Andamento', done: 'Concluído' };
    return map[statusGroup] || 'Pendente';
  }

  // ── localStorage helpers ──────────────────────────────────────────
  function localGet()        { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(e) { return null; } }
  function localSet(tasks)   { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  function catsGet()         { try { return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || 'null'); } catch(e) { return null; } }
  function catsSet(cats)     { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats)); }

  // ── In-memory cache ───────────────────────────────────────────────
  var _cache = null;
  var _synced = false;

  // ── Fetch all tasks from Supabase ─────────────────────────────────
  function fetchFromSupabase(callback) {
    fetch(SUPA_URL + '/rest/v1/tasks?select=*&order=id.asc', {
      method: 'GET',
      headers: supaHeaders()
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(rows) {
      var tasks = rows.map(enrichTask);
      _cache   = tasks;
      _synced  = true;
      localSet(tasks);
      if (callback) callback(tasks, null);
    })
    .catch(function(err) {
      console.warn('[AppStore] Supabase fetch failed, using localStorage:', err.message);
      if (callback) callback(null, err);
    });
  }

  // ── Sync on load ──────────────────────────────────────────────────
  (function init() {
    // Use cached local data immediately so UI renders fast
    _cache = localGet();

    // Then hydrate from Supabase
    fetchFromSupabase(function(tasks, err) {
      if (tasks && !err) {
        // Trigger a re-render if the board is already painted
        if (typeof window.updateColumnCounts === 'function') {
          // Re-render board with fresh data
          var event = new CustomEvent('appstore:synced', { detail: { tasks: tasks } });
          window.dispatchEvent(event);
        }
      }
    });
  })();

  // ── Public API ────────────────────────────────────────────────────
  return {

    // Returns tasks from cache (fast); call refresh() to update from server
    getTasks: function () {
      return _cache || [];
    },

    // Force refresh from Supabase
    refresh: function(callback) {
      fetchFromSupabase(callback);
    },

    // ── Categories ───────────────────────────────────────────────
    getCategories: function () {
      return catsGet() || defaultCategories;
    },

    saveCategories: function(cats) {
      catsSet(cats);
    },

    addCategory: function (name, color) {
      var cats = this.getCategories();
      if (!cats.find(function(c) { return c.name === name; })) {
        cats.push({ name: name, color: color || 'blue' });
        catsSet(cats);
      }
    },

    deleteCategory: function (name) {
      catsSet(this.getCategories().filter(function(c) { return c.name !== name; }));
    },

    // ── Tasks CRUD ───────────────────────────────────────────────
    addTask: function (task, callback) {
      var payload = {
        category:    task.category    || 'Sem Categoria',
        activity:    task.activity    || '',
        responsible: task.responsible || '',
        status:      task.status      || statusLabelToDb(task.status_group),
        priority:    task.priority    || 'Média'
      };

      fetch(SUPA_URL + '/rest/v1/tasks', {
        method: 'POST',
        headers: supaHeaders(),
        body: JSON.stringify(payload)
      })
      .then(function(res) { return res.json(); })
      .then(function(rows) {
        var newTask = enrichTask(Array.isArray(rows) ? rows[0] : rows);
        _cache = (_cache || []).concat([newTask]);
        localSet(_cache);
        if (callback) callback(newTask, null);
      })
      .catch(function(err) {
        // Fallback: add locally with temp id
        console.warn('[AppStore] addTask failed remotely, using local:', err);
        task.id = Date.now();
        task.status_group = task.status_group || 'pending';
        task.badge_color  = categoryColor(task.category);
        _cache = (_cache || []).concat([task]);
        localSet(_cache);
        if (callback) callback(task, err);
      });

      // Optimistic local update
      task.id = 'temp-' + Date.now();
      task.status_group = task.status_group || 'pending';
      task.badge_color  = categoryColor(task.category);
      _cache = (_cache || []).concat([task]);
      localSet(_cache);
      return task;
    },

    updateTask: function (id, updatedFields, callback) {
      // Map status_group → status string for DB
      if (updatedFields.status_group && !updatedFields.status) {
        updatedFields.status = statusLabelToDb(updatedFields.status_group);
      }

      // Optimistic local update
      if (_cache) {
        var idx = _cache.findIndex(function(t) { return t.id == id; });
        if (idx !== -1) {
          _cache[idx] = Object.assign({}, _cache[idx], updatedFields);
          localSet(_cache);
        }
      }

      // Skip remote update for temp ids
      if (String(id).indexOf('temp-') === 0) {
        if (callback) callback(_cache ? _cache.find(function(t){ return t.id == id; }) : null, null);
        return;
      }

      var dbPayload = {};
      if (updatedFields.status)      dbPayload.status      = updatedFields.status;
      if (updatedFields.category)    dbPayload.category    = updatedFields.category;
      if (updatedFields.activity)    dbPayload.activity    = updatedFields.activity;
      if (updatedFields.responsible) dbPayload.responsible = updatedFields.responsible;
      if (updatedFields.priority)    dbPayload.priority    = updatedFields.priority;

      if (Object.keys(dbPayload).length === 0) {
        if (callback) callback(null, null);
        return;
      }

      fetch(SUPA_URL + '/rest/v1/tasks?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: supaHeaders(),
        body: JSON.stringify(dbPayload)
      })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(rows) {
        var updated = rows && rows[0] ? enrichTask(rows[0]) : null;
        if (updated && _cache) {
          var i = _cache.findIndex(function(t) { return t.id == id; });
          if (i !== -1) { _cache[i] = updated; localSet(_cache); }
        }
        if (callback) callback(updated, null);
      })
      .catch(function(err) {
        console.warn('[AppStore] updateTask remote failed:', err);
        if (callback) callback(null, err);
      });
    },

    deleteTask: function (id, callback) {
      // Optimistic local delete
      if (_cache) {
        _cache = _cache.filter(function(t) { return t.id != id; });
        localSet(_cache);
      }

      if (String(id).indexOf('temp-') === 0) {
        if (callback) callback(null);
        return;
      }

      fetch(SUPA_URL + '/rest/v1/tasks?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: supaHeaders()
      })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        if (callback) callback(null);
      })
      .catch(function(err) {
        console.warn('[AppStore] deleteTask remote failed:', err);
        if (callback) callback(err);
      });
    },

    // ── Projects ─────────────────────────────────────────────────
    getProjects: function(callback) {
      fetch(SUPA_URL + '/rest/v1/projects?select=*&order=id.asc', {
        method: 'GET',
        headers: supaHeaders()
      })
      .then(function(res) { return res.json(); })
      .then(function(rows) { if (callback) callback(rows, null); })
      .catch(function(err) { if (callback) callback([], err); });
    }
  };
})();
