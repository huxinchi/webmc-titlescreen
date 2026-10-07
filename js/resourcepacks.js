(function() {
  'use strict';

  var STORAGE_KEY = 'mc_resourcepacks';
  var INDEX_URL   = 'assets/resourcepacks/index.js';
  var BASE_DIR    = 'assets/resourcepacks/';

  /* ==========================================================
     localStorage 读写（已选中的 id 列表）
     ========================================================== */
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

  /* ==========================================================
     脚本加载
     ========================================================== */
  function loadScript(url) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload  = function() { resolve(); };
      s.onerror = function() { reject(new Error('load fail: ' + url)); };
      document.head.appendChild(s);
    });
  }

  /* ==========================================================
     IndexedDB 层
     db: mc_resourcepacks
     store: packs (keyPath: 'id')
     record: { id, code, title, description, compatibility, addedAt }
     ========================================================== */
  var IDB_NAME    = 'mc_resourcepacks';
  var IDB_VERSION = 1;
  var IDB_STORE   = 'packs';
  var idbPromise  = null;

  function idbOpen() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise(function(resolve, reject) {
      var req;
      try {
        req = indexedDB.open(IDB_NAME, IDB_VERSION);
      } catch (e) { reject(e); return; }
      req.onupgradeneeded = function() {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror   = function() { reject(req.error); };
    });
    return idbPromise;
  }

  function idbAll() {
    return idbOpen().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror   = function() { reject(req.error); };
      });
    });
  }

  function idbPut(record) {
    return idbOpen().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(record);
        tx.oncomplete = function() { resolve(); };
        tx.onerror    = function() { reject(tx.error); };
      });
    });
  }

  function idbDelete(id) {
    return idbOpen().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = function() { resolve(); };
        tx.onerror    = function() { reject(tx.error); };
      });
    });
  }

  /* ==========================================================
     用户包状态
     - userPacks: id -> 从 IDB 读出的 record（含 code）
     - userPackIndex: 合并进 getIndex() 的条目
     ========================================================== */
  var userPacks     = {};
  var userPackIndex = [];

  /* 用户包代码执行：直接 new Function 跑，写入 window.__mcResourcePacks */
  function execUserPack(pack) {
    try {
      /* 保证容器存在 */
      if (!window.__mcResourcePacks) window.__mcResourcePacks = {};
      /* 包装执行 —— 用户代码自己写 window.__mcResourcePacks[id] = {...} */
      (new Function(pack.code))();
    } catch (e) {
      console.error('[rp] user pack exec failed:', pack.id, e);
    }
  }

  /* 从代码里"沙盒"提取元信息，不污染真实注册表 */
  function extractPackMeta(code) {
    var saved = window.__mcResourcePacks || (window.__mcResourcePacks = {});
    var before = {};
    Object.keys(saved).forEach(function(k) { before[k] = true; });

    var temp = {};
    window.__mcResourcePacks = temp;
    try {
      (new Function(code))();
    } catch (e) {
      console.error('[rp] extract exec failed:', e);
    }
    window.__mcResourcePacks = saved;

    var newIds = Object.keys(temp).filter(function(k) { return !before[k]; });
    if (newIds.length === 0) return null;

    var id   = newIds[0];
    var pack = temp[id] || {};
    return {
      id:            id,
      title:         pack.title || id,
      description:   pack.description || '',
      compatibility: pack.compatibility || 'compatible'
    };
  }

  /* ==========================================================
     索引（内置 + 用户）
     ========================================================== */
  var indexReady = null;

  function loadBuiltinIndex() {
    return loadScript(INDEX_URL)
      .catch(function() { window.__mcResourcePackIndex = []; })
      .then(function() {
        if (!window.__mcResourcePackIndex) window.__mcResourcePackIndex = [];
      });
  }

  function loadUserPacks() {
    return idbAll().then(function(packs) {
      userPacks = {};
      userPackIndex = [];
      packs.forEach(function(p) {
        execUserPack(p);
        userPacks[p.id] = p;
        userPackIndex.push({
          id:            p.id,
          file:          null,
          title:         p.title || p.id,
          description:   p.description || '',
          compatibility: p.compatibility || 'compatible',
          isUser:        true
        });
      });
    });
  }

  function ensureIndex() {
    if (indexReady) return indexReady;
    indexReady = Promise.all([loadBuiltinIndex(), loadUserPacks()])
      .then(function() { /* 都完事 */ });
    return indexReady;
  }

  function getIndex() {
    var builtin = window.__mcResourcePackIndex || [];
    return builtin.concat(userPackIndex);
  }

  function getPack(id) {
    return (window.__mcResourcePacks || {})[id] || null;
  }

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

  /* ==========================================================
     应用 / 反应用
     ========================================================== */
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
     loadAll —— 加载所有内置包的 js（用户包已在 ensureIndex 里执行）
     ========================================================== */
  function loadAllPacks() {
    return ensureIndex().then(function() {
      var chain = Promise.resolve();
      getIndex().forEach(function(entry) {
        if (entry.isUser) return;
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
     ========================================================== */
  function applyPacks(ids) {
    return ensureIndex().then(function() {

      Object.keys(applied).forEach(function(id) {
        if (ids.indexOf(id) < 0) unapplyOne(getPack(id));
      });

      var loadOrder = ids.slice().reverse();

      var loadChain = Promise.resolve();
      loadOrder.forEach(function(id) {
        var entry = findEntry(id);
        if (!entry || entry.isUser) return;
        loadChain = loadChain.then(function() {
          if (getPack(id)) return;
          return loadScript(BASE_DIR + entry.file).catch(function() {});
        });
      });

/* 4. 全部加载完后，按顺序 apply
   - terminal 之前（UI 下面，低优先级）的包全部跳过
   - terminal 自己 + terminal 之后（UI 上面，高优先级）才 apply
   语义：terminal 相当于"生效底线"，它下面的包被视为它的一部分，
         单独 apply 会被覆盖，所以直接不跑
*/
return loadChain.then(function() {
  var terminalIndex = -1;
  for (var i = 0; i < loadOrder.length; i++) {
    var e = findEntry(loadOrder[i]);
    if (e && e.terminal) { terminalIndex = i; break; }
  }

  var start = (terminalIndex >= 0) ? terminalIndex : 0;

  for (var j = start; j < loadOrder.length; j++) {
    var id    = loadOrder[j];
    var entry = findEntry(id);
    if (!entry) continue;
    var pack = getPack(id);
    if (pack) applyOne(pack);
  }
});
    });
  }

  /* ==========================================================
     导入 / 删除 API
     ========================================================== */

  /* 通知外部索引变化 */
  function fireIndexChanged() {
    if (typeof window.mcResourcePacks.onIndexChanged === 'function') {
      try { window.mcResourcePacks.onIndexChanged(); } catch (e) {}
    }
  }

  /* 导入单个 .js 文件 */
  function importFile(file) {
    if (!file) return Promise.reject(new Error('no file'));
    if (!/\.js$/i.test(file.name)) {
      return Promise.reject(new Error('Only .js files are supported'));
    }
    return file.text().then(function(code) {
      var meta = extractPackMeta(code);
      if (!meta) {
        return Promise.reject(new Error('No pack found in this file'));
      }
      var record = {
        id:            meta.id,
        code:          code,
        title:         meta.title,
        description:   meta.description,
        compatibility: meta.compatibility,
        addedAt:       Date.now()
      };
      return idbPut(record).then(function() {
        /* 真正注册到 window.__mcResourcePacks */
        execUserPack(record);
        userPacks[record.id] = record;
        /* 索引去重后加入 */
        userPackIndex = userPackIndex.filter(function(e) { return e.id !== record.id; });
        userPackIndex.push({
          id:            record.id,
          file:          null,
          title:         record.title,
          description:   record.description,
          compatibility: record.compatibility,
          isUser:        true
        });
        fireIndexChanged();
        return record.id;
      });
    });
  }

  /* 导入文件夹 —— 传 File[]，需带 webkitRelativePath 或用 input.files
     规则：优先找 pack.js，其次 main.js / index.js，再次找唯一的 .js */
  function importFolder(fileList) {
    if (!fileList || !fileList.length) {
      return Promise.reject(new Error('No files in folder'));
    }
    var entryFile = null;
    var fallbackJs = null;
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      if (!/\.js$/i.test(f.name)) continue;
      if (f.name === 'pack.js')      { entryFile = f; break; }
      if (f.name === 'main.js' && !entryFile) entryFile = f;
      if (f.name === 'index.js' && !entryFile) entryFile = f;
      if (!fallbackJs) fallbackJs = f;
    }
    if (!entryFile) entryFile = fallbackJs;
    if (!entryFile) {
      return Promise.reject(new Error('No .js file found in the folder'));
    }
    return importFile(entryFile);
  }

  /* 删除用户包 */
  function deleteUserPack(id) {
    if (!userPacks[id]) return Promise.resolve(false);
    return idbDelete(id).then(function() {
      delete userPacks[id];
      delete (window.__mcResourcePacks || {})[id];
      userPackIndex = userPackIndex.filter(function(e) { return e.id !== id; });

      /* 从 applied 移除 */
      if (applied[id]) delete applied[id];

      /* 从 selected 移除 */
      var sel = readSaved() || [];
      if (sel.indexOf(id) >= 0) {
        sel = sel.filter(function(x) { return x !== id; });
        saveSelected(sel);
      }

      fireIndexChanged();
      return true;
    });
  }

  function isUserPack(id) {
    return !!userPacks[id];
  }

  /* ==========================================================
     对外
     ========================================================== */
  window.mcResourcePacks = {
    ready:       ensureIndex(),
    getIndex:    getIndex,
    getPack:     getPack,
    getSelected: getSelected,
    setSelected: setSelected,
    loadAll:     loadAllPacks,
    isUserPack:  isUserPack,

    importFile:      importFile,
    importFolder:    importFolder,
    deleteUserPack:  deleteUserPack,

    /* 由页面挂载：索引变化时触发 */
    onIndexChanged: null,

    reload: function() {
      indexReady = null;
      return ensureIndex().then(function() {
        return applyPacks(getSelected());
      });
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