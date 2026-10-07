(function() {
  'use strict';

  var STORAGE_KEY = 'mc_resourcepacks';
  var INDEX_URL   = 'assets/resourcepacks/index.js';
  var BASE_DIR    = 'assets/resourcepacks/';

  function readSaved() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (!s) return null;
      var arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : null;
    } catch (e) { return null; }
  }

  function saveSelected(ids) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (e) {}
  }

  function loadScript(url) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload  = function() { resolve(); };
      s.onerror = function() { reject(new Error('load fail: ' + url)); };
      document.head.appendChild(s);
    });
  }

  var indexReady = null;

  function ensureIndex() {
    if (indexReady) return indexReady;
    indexReady = loadScript(INDEX_URL)
      .catch(function() { window.__mcResourcePackIndex = []; })
      .then(function() {
        if (!window.__mcResourcePackIndex) window.__mcResourcePackIndex = [];
      });
    return indexReady;
  }

  function getIndex() { return window.__mcResourcePackIndex || []; }
  function getPack(id) { return (window.__mcResourcePacks || {})[id] || null; }

  function findEntry(id) {
    var list = getIndex();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function isEntryRequired(entry) {
    if (!entry) return false;
    return !!entry.required;
  }

  function getSelected() {
    var saved = readSaved() || [];
    var result = saved.slice();
    getIndex().forEach(function(e) {
      if (isEntryRequired(e) && result.indexOf(e.id) < 0) {
        result.push(e.id);
      }
    });
    return result;
  }

  function setSelected(ids) {
    saveSelected(ids);
    return applyPacks(ids);
  }

  var applied = {};

  function applyOne(pack) {
    if (!pack) return;
    if (typeof pack.apply === 'function') {
      try { pack.apply(); } catch (e) { console.error('[rp] apply', pack.id, e); }
    }
    applied[pack.id] = true;
  }

  function unapplyOne(pack) {
    if (!pack) return;
    if (typeof pack.unapply === 'function') {
      try { pack.unapply(); } catch (e) { console.error('[rp] unapply', pack.id, e); }
    }
    delete applied[pack.id];
  }

  /* ==========================================================
     loadAll —— 加载 index 里**所有**包的 js（不 apply）
     让 available / selected 两边的数据都可读
     ========================================================== */
  function loadAllPacks() {
    return ensureIndex().then(function() {
      var chain = Promise.resolve();
      getIndex().forEach(function(entry) {
        chain = chain.then(function() {
          if (getPack(entry.id)) return;
          return loadScript(BASE_DIR + entry.file).catch(function() {});
        });
      });
      return chain;
    });
  }

  /* ==========================================================
     applyPacks —— 应用已选中的包

     加载顺序：selectedIds[0] = UI 顶部 = 最高优先级 = 最后加载
               所以 loadOrder = ids.slice().reverse()
               （底部先加载，顶部覆盖底部）

     terminal: 加载到该包后，它**之后**（更晚加载，即 UI 更上面）
               的 apply 全部跳过 —— 模拟"被原版覆盖"
               loadScript 不受影响，数据仍可读
     ========================================================== */
  function applyPacks(ids) {
    return ensureIndex().then(function() {

      /* 1. 取消不再选中的 */
      Object.keys(applied).forEach(function(id) {
        if (ids.indexOf(id) < 0) unapplyOne(getPack(id));
      });

      /* 2. 加载顺序：UI 底部 → UI 顶部 */
      var loadOrder = ids.slice().reverse();

      /* 3. 先全部 loadScript（不 apply） */
      var loadChain = Promise.resolve();
      loadOrder.forEach(function(id) {
        var entry = findEntry(id);
        if (!entry) return;
        loadChain = loadChain.then(function() {
          if (getPack(id)) return;
          return loadScript(BASE_DIR + entry.file).catch(function() {});
        });
      });

      /* 4. 全部加载完后，按顺序 apply —— terminal 触发后停止 */
      return loadChain.then(function() {
        var stopped = false;
        loadOrder.forEach(function(id) {
          var entry = findEntry(id);
          if (!entry) return;
          if (stopped) return;
          var pack = getPack(id);
          if (pack) applyOne(pack);
          if (entry.terminal) stopped = true;
        });
      });
    });
  }

  window.mcResourcePacks = {
    ready:       ensureIndex(),
    getIndex:    getIndex,
    getPack:     getPack,
    getSelected: getSelected,
    setSelected: setSelected,
    loadAll:     loadAllPacks,

    reload: function() {
      indexReady = null;
      return applyPacks(getSelected());
    }
  };

  function boot() {
    applyPacks(getSelected());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();