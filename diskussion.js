/* ============================================================
   DyadIQ — Diskussionsteil
   Speicher: Supabase (REST, ohne SDK). Ohne Konfiguration fällt
   die Seite auf localStorage zurück, damit sie testbar bleibt.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.DYADIQ_CONFIG || {};
  var HAS_REMOTE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  var POLL_MS = 4000;

  /* ---------- Hilfsfunktionen ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.classList.toggle('is-hidden', !on); }
  function timeOf(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- Speicher-Schicht ---------- */
  var remote = {
    headers: function (extra) {
      var h = {
        apikey: CFG.supabaseAnonKey,
        Authorization: 'Bearer ' + CFG.supabaseAnonKey,
        'Content-Type': 'application/json'
      };
      for (var k in extra) h[k] = extra[k];
      return h;
    },
    url: function (path) { return CFG.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + path; },

    getState: function () {
      return fetch(this.url('session_state?select=discussion_open,reveal_open&id=eq.1'), { headers: this.headers() })
        .then(function (r) { if (!r.ok) throw new Error('state ' + r.status); return r.json(); })
        .then(function (rows) { return rows[0] || { discussion_open: false, reveal_open: false }; });
    },
    setState: function (patch) {
      return fetch(this.url('session_state?id=eq.1'), {
        method: 'PATCH',
        headers: this.headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(patch)
      }).then(function (r) { if (!r.ok) throw new Error('setState ' + r.status); });
    },
    list: function () {
      return fetch(this.url('submissions?select=id,created_at,task,group_name,answers,key_statement&order=id.asc'), { headers: this.headers() })
        .then(function (r) { if (!r.ok) throw new Error('list ' + r.status); return r.json(); });
    },
    add: function (rec) {
      return fetch(this.url('submissions'), {
        method: 'POST',
        headers: this.headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(rec)
      }).then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('add ' + r.status)); }); });
    }
  };

  var LK = 'dyadiq.local.';
  var local = {
    getState: function () {
      return Promise.resolve({
        discussion_open: localStorage.getItem(LK + 'discussion') === '1',
        reveal_open: localStorage.getItem(LK + 'reveal') === '1'
      });
    },
    setState: function (patch) {
      if ('discussion_open' in patch) localStorage.setItem(LK + 'discussion', patch.discussion_open ? '1' : '0');
      if ('reveal_open' in patch) localStorage.setItem(LK + 'reveal', patch.reveal_open ? '1' : '0');
      return Promise.resolve();
    },
    list: function () {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(LK + 'subs') || '[]')); }
      catch (e) { return Promise.resolve([]); }
    },
    add: function (rec) {
      var self = this;
      return this.list().then(function (rows) {
        rec.id = rows.length + 1;
        rec.created_at = new Date().toISOString();
        rows.push(rec);
        localStorage.setItem(LK + 'subs', JSON.stringify(rows));
      });
    }
  };

  var store = HAS_REMOTE ? remote : local;

  /* ---------- Moderationsmodus ---------- */
  var params = new URLSearchParams(location.search);
  var isPresenter = !!(CFG.presenterCode && params.get('presenter') === CFG.presenterCode);

  /* ---------- Verbindungshinweis ---------- */
  var banner = $('conn-banner');
  function setBanner(text, kind) {
    if (!banner) return;
    banner.textContent = text;
    banner.className = 'conn-banner' + (kind ? ' conn-' + kind : '');
    show(banner, !!text);
  }
  if (!HAS_REMOTE) {
    setBanner('Testmodus — keine Datenbank verbunden. Eingaben bleiben nur in diesem Browser.', 'warn');
  }

  /* ---------- Zustand rendern ---------- */
  var state = { discussion_open: false, reveal_open: false };
  var lastSubsJSON = '';

  function renderState() {
    var open = state.discussion_open || isPresenter;
    show($('locked-screen'), !open);
    show($('discussion-content'), open);
    show($('reveal-locked'), !state.reveal_open);
    show($('reveal-open'), state.reveal_open);

    var td = $('toggle-discussion'), tr = $('toggle-reveal');
    if (td) {
      td.textContent = state.discussion_open ? 'Diskussion schließen' : 'Diskussion freischalten';
      td.classList.toggle('is-on', state.discussion_open);
    }
    if (tr) {
      tr.textContent = state.reveal_open ? 'Auflösung verbergen' : 'Auflösung freischalten';
      tr.classList.toggle('is-on', state.reveal_open);
    }
  }

  function renderSubs(rows) {
    var json = JSON.stringify(rows);
    if (json === lastSubsJSON) return;
    lastSubsJSON = json;

    [1, 2, 3].forEach(function (t) {
      var host = $('res-' + t);
      if (!host) return;
      var mine = rows.filter(function (r) { return Number(r.task) === t; });
      if (!mine.length) {
        host.innerHTML = '<p class="results-empty">Noch keine Abgabe.</p>';
        return;
      }
      host.innerHTML = mine.map(function (r) {
        var details = '';
        if (isPresenter && r.answers && Object.keys(r.answers).length) {
          details = '<details class="res-details"><summary>Details</summary><dl>' +
            Object.keys(r.answers).map(function (k) {
              return '<dt>' + esc(k) + '</dt><dd>' + esc(r.answers[k]) + '</dd>';
            }).join('') + '</dl></details>';
        }
        return '<article class="res-card">' +
          '<header><span class="res-group">' + esc(r.group_name) + '</span>' +
          '<span class="res-time">' + esc(timeOf(r.created_at)) + '</span></header>' +
          '<p>' + esc(r.key_statement) + '</p>' + details + '</article>';
      }).join('');
    });

    var pc = $('presenter-count');
    if (pc) pc.textContent = rows.length + ' Abgabe' + (rows.length === 1 ? '' : 'n');
  }

  /* ---------- Poll-Schleife ---------- */
  var failures = 0;
  function tick() {
    Promise.all([store.getState(), store.list()])
      .then(function (res) {
        failures = 0;
        if (HAS_REMOTE && banner && banner.classList.contains('conn-error')) setBanner('', '');
        state = res[0] || state;
        renderState();
        renderSubs(res[1] || []);
      })
      .catch(function (err) {
        failures++;
        if (HAS_REMOTE && failures >= 2) {
          setBanner('Verbindung zur Datenbank gestört — es wird weiter versucht. (' + err.message + ')', 'error');
        }
      });
  }

  /* ---------- Moderationsleiste ---------- */
  if (isPresenter) {
    show($('presenter-bar'), true);
    document.body.classList.add('is-presenter');
    var td = $('toggle-discussion'), tr = $('toggle-reveal');
    if (td) td.addEventListener('click', function () {
      store.setState({ discussion_open: !state.discussion_open }).then(tick).catch(function (e) { alert('Konnte nicht umschalten: ' + e.message); });
    });
    if (tr) tr.addEventListener('click', function () {
      store.setState({ reveal_open: !state.reveal_open }).then(tick).catch(function (e) { alert('Konnte nicht umschalten: ' + e.message); });
    });
  }

  /* ---------- Formulare ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.task-form'), function (form) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var group = String(data.get('group') || '').trim();
      var key = String(data.get('key') || '').trim();
      if (!group || !key) return;

      var answers = {};
      data.forEach(function (v, k) {
        if (k === 'group' || k === 'key') return;
        var s = String(v).trim();
        if (s) answers[k] = answers[k] ? answers[k] + ' · ' + s : s;
      });

      button.disabled = true;
      status.textContent = 'Wird gesendet …';
      status.className = 'form-status';

      store.add({
        task: Number(form.dataset.task),
        group_name: group.slice(0, 60),
        key_statement: key.slice(0, 400),
        answers: answers
      }).then(function () {
        status.textContent = 'Abgegeben — danke!';
        status.className = 'form-status is-ok';
        form.classList.add('is-submitted');
        tick();
      }).catch(function (err) {
        button.disabled = false;
        status.textContent = 'Fehler: ' + err.message;
        status.className = 'form-status is-error';
      });
    });
  });

  /* ---------- Start ---------- */
  tick();
  setInterval(tick, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
})();
