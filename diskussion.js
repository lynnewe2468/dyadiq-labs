/* ============================================================
   DyadIQ — Demo-Teil
   Speicher: Supabase (REST, ohne SDK). Ohne Konfiguration fällt
   die Seite auf localStorage zurück, damit sie testbar bleibt.

   Lokal im Browser gemerkt werden ausserdem:
   - Entwürfe der Formulare (überleben Seitenwechsel)
   - welche Aufgabe bereits abgegeben wurde (inkl. Abgabe-ID,
     damit der Stand zurückfällt, wenn die Moderation löscht)
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.DYADIQ_CONFIG || {};
  var HAS_REMOTE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  var POLL_MS = 4000;
  var DRAFT_KEY = 'dyadiq.draft.';
  var SENT_KEY = 'dyadiq.sent.';

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
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

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
        headers: this.headers({ Prefer: 'return=representation' }),
        body: JSON.stringify(rec)
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('add ' + r.status)); });
        return r.json();
      }).then(function (rows) { return (rows && rows[0]) || null; });
    },
    remove: function (id) {
      return fetch(this.url('submissions?id=eq.' + encodeURIComponent(id)), {
        method: 'DELETE', headers: this.headers({ Prefer: 'return=minimal' })
      }).then(function (r) { if (!r.ok) throw new Error('delete ' + r.status); });
    },
    clear: function () {
      return fetch(this.url('submissions?id=gt.0'), {
        method: 'DELETE', headers: this.headers({ Prefer: 'return=minimal' })
      }).then(function (r) { if (!r.ok) throw new Error('clear ' + r.status); });
    }
  };

  var LK = 'dyadiq.local.';
  var local = {
    getState: function () {
      return Promise.resolve({
        discussion_open: ls(LK + 'discussion') === '1',
        reveal_open: ls(LK + 'reveal') === '1'
      });
    },
    setState: function (patch) {
      if ('discussion_open' in patch) lsSet(LK + 'discussion', patch.discussion_open ? '1' : '0');
      if ('reveal_open' in patch) lsSet(LK + 'reveal', patch.reveal_open ? '1' : '0');
      return Promise.resolve();
    },
    _rows: function () {
      try { return JSON.parse(ls(LK + 'subs') || '[]'); } catch (e) { return []; }
    },
    list: function () { return Promise.resolve(this._rows()); },
    add: function (rec) {
      var rows = this._rows();
      rec.id = (rows.length ? rows[rows.length - 1].id : 0) + 1;
      rec.created_at = new Date().toISOString();
      rows.push(rec);
      lsSet(LK + 'subs', JSON.stringify(rows));
      return Promise.resolve(rec);
    },
    remove: function (id) {
      lsSet(LK + 'subs', JSON.stringify(this._rows().filter(function (r) { return r.id !== id; })));
      return Promise.resolve();
    },
    clear: function () { lsSet(LK + 'subs', '[]'); return Promise.resolve(); }
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

  /* ============================================================
     Entwürfe: Formularinhalte überleben den Seitenwechsel
     ============================================================ */
  function formFields(form) {
    return Array.prototype.filter.call(form.elements, function (el) { return el.name; });
  }

  function readForm(form) {
    var out = { _radio: {}, _check: {}, _text: {} };
    formFields(form).forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) out._radio[el.name] = el.value; }
      else if (el.type === 'checkbox') { out._check[el.name] = el.checked; }
      else { out._text[el.name] = el.value; }
    });
    return out;
  }

  function writeForm(form, data) {
    if (!data) return false;
    var touched = false;
    formFields(form).forEach(function (el) {
      if (el.type === 'radio') {
        if (data._radio && data._radio[el.name] === el.value) { el.checked = true; touched = true; }
      } else if (el.type === 'checkbox') {
        if (data._check && data._check[el.name]) { el.checked = true; touched = true; }
      } else if (data._text && typeof data._text[el.name] === 'string' && data._text[el.name]) {
        el.value = data._text[el.name]; touched = true;
      }
    });
    return touched;
  }

  function saveDraft(form) {
    try { lsSet(DRAFT_KEY + form.dataset.task, JSON.stringify(readForm(form))); } catch (e) {}
  }
  function loadDraft(form) {
    try { return JSON.parse(ls(DRAFT_KEY + form.dataset.task) || 'null'); } catch (e) { return null; }
  }

  /* ============================================================
     Antworten einsammeln — in Dokumentreihenfolge, mit lesbaren
     Beschriftungen, damit sie unverändert veröffentlicht werden können
     ============================================================ */
  function optText(input) {
    var lab = input.closest ? input.closest('label') : null;
    return lab ? lab.textContent.replace(/\s+/g, ' ').trim() : input.value;
  }

  function collectAnswers(form) {
    var items = [];
    Array.prototype.forEach.call(form.querySelectorAll('[data-answer-group]'), function (g) {
      var label = g.getAttribute('data-answer-group');
      var kind = g.getAttribute('data-answer-kind');
      if (kind === 'radio') {
        var sel = g.querySelector('input[type="radio"]:checked');
        if (sel) items.push({ label: label, value: optText(sel) });
      } else if (kind === 'checkbox') {
        var picked = Array.prototype.map.call(g.querySelectorAll('input[type="checkbox"]:checked'), optText);
        if (picked.length) items.push({ label: label, value: picked });
      } else {
        var t = g.querySelector('textarea, input[type="text"]');
        var v = t ? t.value.trim() : '';
        if (v) items.push({ label: label, value: v });
      }
    });
    return items;
  }

  /* ---------- Wortlimit für die optionalen Begründungen ---------- */
  function countWords(v) {
    var t = String(v == null ? '' : v).trim();
    return t ? t.split(/\s+/).length : 0;
  }

  /* Zeigt unter jedem begrenzten Feld einen Zähler an */
  function setupWordLimits(form) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-max-words]'), function (ta) {
      var max = Number(ta.getAttribute('data-max-words')) || 0;
      if (!max || ta.dataset.wcReady) return;
      ta.dataset.wcReady = '1';

      var counter = document.createElement('p');
      counter.className = 'word-count';
      ta.parentNode.insertBefore(counter, ta.nextSibling);

      function update() {
        var n = countWords(ta.value);
        counter.textContent = n + ' / ' + max + ' Wörter';
        counter.classList.toggle('is-over', n > max);
        counter.classList.toggle('is-near', n <= max && n > Math.floor(max * 0.9));
        ta.classList.toggle('is-over', n > max);
      }
      ta.addEventListener('input', update);
      update();
    });
  }

  /* Meldet das erste Feld, das über dem Wortlimit liegt */
  function checkWordLimits(form) {
    var problem = null;
    Array.prototype.forEach.call(form.querySelectorAll('[data-max-words]'), function (ta) {
      if (problem) return;
      var max = Number(ta.getAttribute('data-max-words')) || 0;
      var n = countWords(ta.value);
      if (!max || n <= max) return;
      var g = ta.closest ? ta.closest('[data-answer-group]') : null;
      var label = (g && g.getAttribute('data-answer-group')) || 'Begründung';
      problem = label + ' ist zu lang: ' + n + ' von höchstens ' + max + ' Wörtern.';
      try { ta.focus(); } catch (e) {}
    });
    return problem;
  }

  /* Pflichtfelder, die der Browser nicht selbst prüfen kann */
  function checkGroups(form) {
    var problem = null;
    Array.prototype.forEach.call(form.querySelectorAll('[data-answer-kind="checkbox"][data-min]'), function (g) {
      if (problem) return;
      var min = Number(g.getAttribute('data-min')) || 0;
      if (g.querySelectorAll('input[type="checkbox"]:checked').length < min) {
        problem = min === 1 ? 'Bitte mindestens eine Option auswählen.'
                            : 'Bitte mindestens ' + min + ' Optionen auswählen.';
      }
    });
    return problem;
  }

  /* ============================================================
     Abgabe-Status: bleibt erhalten, fällt aber zurück, wenn die
     Moderation die Abgabe wieder löscht
     ============================================================ */
  function markSubmitted(form, on, text) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    form.classList.toggle('is-submitted', on);
    if (button) button.disabled = on;
    if (status) {
      status.textContent = on ? (text || 'Bereits abgegeben.') : '';
      status.className = 'form-status' + (on ? ' is-ok' : '');
    }
  }

  function sentId(task) {
    var v = ls(SENT_KEY + task);
    return v === null ? null : Number(v);
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
      td.textContent = state.discussion_open ? 'Demo schließen' : 'Demo freischalten';
      td.classList.toggle('is-on', state.discussion_open);
    }
    if (tr) {
      tr.textContent = state.reveal_open ? 'Auflösung verbergen' : 'Auflösung freischalten';
      tr.classList.toggle('is-on', state.reveal_open);
    }
  }

  /* Antworten einer Abgabe darstellen. Verträgt auch das alte Format
     (flaches Objekt) aus früheren Probeläufen. */
  function answersHtml(r) {
    var a = r.answers;
    var items = a && Array.isArray(a.items) ? a.items
      : (a && typeof a === 'object'
          ? Object.keys(a).map(function (k) { return { label: k, value: a[k] }; })
          : []);
    var out = '';
    if (r.key_statement) out += '<p class="res-legacy">' + esc(r.key_statement) + '</p>';
    if (!items.length) return out || '<p class="res-legacy">Keine Angaben.</p>';
    out += '<dl class="res-answers">' + items.map(function (it) {
      var v = Array.isArray(it.value)
        ? '<ul>' + it.value.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
        : esc(it.value);
      return '<dt>' + esc(it.label) + '</dt><dd>' + v + '</dd>';
    }).join('') + '</dl>';
    return out;
  }

  function renderSubs(rows) {
    // Abgabe-Status gegen die tatsächlich vorhandenen Zeilen abgleichen
    var ids = {};
    rows.forEach(function (r) { ids[Number(r.id)] = true; });
    Array.prototype.forEach.call(document.querySelectorAll('.task-form'), function (form) {
      var id = sentId(form.dataset.task);
      if (id === null) return;
      if (ids[id]) {
        if (!form.classList.contains('is-submitted')) markSubmitted(form, true);
      } else {
        lsDel(SENT_KEY + form.dataset.task);
        markSubmitted(form, false);
      }
    });

    var json = JSON.stringify(rows) + '|' + isPresenter;
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
        var del = isPresenter
          ? '<button class="res-del" type="button" data-del="' + esc(r.id) + '" title="Diese Abgabe löschen" aria-label="Abgabe von ' + esc(r.group_name) + ' löschen">&times;</button>'
          : '';
        return '<article class="res-card">' +
          '<header><span class="res-group">' + esc(r.group_name) + '</span>' +
          '<span class="res-time">' + esc(timeOf(r.created_at)) + '</span>' + del + '</header>' +
          answersHtml(r) + '</article>';
      }).join('');
    });

    var pc = $('presenter-count');
    if (pc) pc.textContent = rows.length + ' Abgabe' + (rows.length === 1 ? '' : 'n');
  }

  /* ---------- Poll-Schleife ---------- */
  var failures = 0;
  function tick() {
    return Promise.all([store.getState(), store.list()])
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

    var td = $('toggle-discussion'), tr = $('toggle-reveal'), ca = $('clear-all');
    if (td) td.addEventListener('click', function () {
      store.setState({ discussion_open: !state.discussion_open }).then(tick)
        .catch(function (e) { alert('Konnte nicht umschalten: ' + e.message); });
    });
    if (tr) tr.addEventListener('click', function () {
      store.setState({ reveal_open: !state.reveal_open }).then(tick)
        .catch(function (e) { alert('Konnte nicht umschalten: ' + e.message); });
    });
    if (ca) ca.addEventListener('click', function () {
      if (!confirm('Wirklich ALLE Abgaben löschen? Das lässt sich nicht rückgängig machen.')) return;
      store.clear().then(tick).catch(function (e) { alert('Löschen fehlgeschlagen: ' + e.message); });
    });

    // Einzelne Abgabe löschen (Delegation, weil neu gerendert wird)
    var grid = $('results-grid');
    if (grid) grid.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-del]');
      if (!btn) return;
      if (!confirm('Diese Abgabe löschen?')) return;
      btn.disabled = true;
      store.remove(Number(btn.getAttribute('data-del')))
        .then(function () { lastSubsJSON = ''; return tick(); })
        .catch(function (err) { btn.disabled = false; alert('Löschen fehlgeschlagen: ' + err.message); });
    });
  }

  /* ---------- Formulare ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.task-form'), function (form) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');

    // Entwurf wiederherstellen
    var restored = writeForm(form, loadDraft(form));
    if (restored && sentId(form.dataset.task) === null) {
      var note = document.createElement('p');
      note.className = 'draft-note';
      note.textContent = 'Eure vorherigen Eingaben wurden wiederhergestellt.';
      form.insertBefore(note, form.firstChild);
    }
    setupWordLimits(form);
    if (sentId(form.dataset.task) !== null) markSubmitted(form, true);

    // Entwurf laufend sichern
    form.addEventListener('input', function () { saveDraft(form); });
    form.addEventListener('change', function () { saveDraft(form); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var problem = checkWordLimits(form) || checkGroups(form);
      if (problem) {
        status.textContent = problem;
        status.className = 'form-status is-error';
        return;
      }

      var group = String(new FormData(form).get('group') || '').trim();
      if (!group) return;

      var items = collectAnswers(form);
      if (!items.length) {
        status.textContent = 'Bitte erst die Aufgabe beantworten.';
        status.className = 'form-status is-error';
        return;
      }

      button.disabled = true;
      status.textContent = 'Wird gesendet …';
      status.className = 'form-status';

      store.add({
        task: Number(form.dataset.task),
        group_name: group.slice(0, 60),
        answers: { items: items }
      }).then(function (row) {
        if (row && row.id != null) lsSet(SENT_KEY + form.dataset.task, String(row.id));
        saveDraft(form);
        markSubmitted(form, true, 'Abgegeben — danke!');
        var n = form.querySelector('.draft-note');
        if (n) n.remove();
        lastSubsJSON = '';
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
