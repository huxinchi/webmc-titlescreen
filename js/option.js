(function() {
  'use strict';

  var STORE_PREFIX = 'mc_option.';
  var listeners = {};

  function fullKey(key) { return STORE_PREFIX + key; }

  /* ==========================================================
     默认值 —— 首次加载写入 localStorage
     之后可通过 mcOptions.get('username') 读取
     ========================================================== */
  var DEFAULTS = {
    'username': 'Steve'
  };

  Object.keys(DEFAULTS).forEach(function(k) {
    try {
      if (localStorage.getItem(fullKey(k)) == null) {
        localStorage.setItem(fullKey(k), JSON.stringify(DEFAULTS[k]));
      }
    } catch (e) {}
  });

  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(fullKey(key));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function set(key, value) {
    try {
      localStorage.setItem(fullKey(key), JSON.stringify(value));
    } catch (e) {}

    var fns = listeners[key];
    if (fns) {
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](value); } catch (e) { console.error('[mcOptions]', e); }
      }
    }

    try {
      document.dispatchEvent(new CustomEvent('mc-option-change', {
        detail: { key: key, value: value }
      }));
    } catch (e) {}
  }

  function on(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
  }

  window.mcOptions = { get: get, set: set, on: on, defaults: DEFAULTS };
})();