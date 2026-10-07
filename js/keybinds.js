(function() {
  'use strict';

  var STORAGE_PREFIX = 'mc_keybind.';

  /* ==========================================================
     数据来自 Options.java（按 Category 排序）
     ========================================================== */
  var KEYBINDS = [
    /* ==== MOVEMENT ==== */
    { key: 'key.forward',  category: 'movement', default: 'KeyW' },
    { key: 'key.left',     category: 'movement', default: 'KeyA' },
    { key: 'key.back',     category: 'movement', default: 'KeyS' },
    { key: 'key.right',    category: 'movement', default: 'KeyD' },
    { key: 'key.jump',     category: 'movement', default: 'Space' },
    { key: 'key.sneak',    category: 'movement', default: 'ShiftLeft' },
    { key: 'key.sprint',   category: 'movement', default: 'ControlLeft' },

    /* ==== MISC ==== */
    { key: 'key.screenshot',                    category: 'misc', default: 'F2' },
    { key: 'key.togglePerspective',             category: 'misc', default: 'F5' },
    { key: 'key.smoothCamera',                  category: 'misc', default: '' },
    { key: 'key.fullscreen',                    category: 'misc', default: 'F11' },
    { key: 'key.advancements',                  category: 'misc', default: 'KeyL' },
    { key: 'key.quickActions',                  category: 'misc', default: 'KeyG' },
    { key: 'key.toggleGui',                     category: 'misc', default: 'F1' },
    { key: 'key.toggleSpectatorShaderEffects',  category: 'misc', default: 'F4' },

    /* ==== MULTIPLAYER ==== */
    { key: 'key.chat',               category: 'multiplayer', default: 'KeyT' },
    { key: 'key.playerlist',         category: 'multiplayer', default: 'Tab' },
    { key: 'key.command',            category: 'multiplayer', default: 'Slash' },
    { key: 'key.friends',            category: 'multiplayer', default: 'KeyO' },
    { key: 'key.socialInteractions', category: 'multiplayer', default: 'KeyP' },

    /* ==== GAMEPLAY ==== */
    { key: 'key.attack',   category: 'gameplay', default: 'MOUSE0' },
    { key: 'key.use',      category: 'gameplay', default: 'MOUSE1' },
    { key: 'key.pickItem', category: 'gameplay', default: 'MOUSE2' },

    /* ==== INVENTORY ==== */
    { key: 'key.inventory',   category: 'inventory', default: 'KeyE' },
    { key: 'key.swapOffhand', category: 'inventory', default: 'KeyF' },
    { key: 'key.drop',        category: 'inventory', default: 'KeyQ' },
    { key: 'key.hotbar.1',    category: 'inventory', default: 'Digit1' },
    { key: 'key.hotbar.2',    category: 'inventory', default: 'Digit2' },
    { key: 'key.hotbar.3',    category: 'inventory', default: 'Digit3' },
    { key: 'key.hotbar.4',    category: 'inventory', default: 'Digit4' },
    { key: 'key.hotbar.5',    category: 'inventory', default: 'Digit5' },
    { key: 'key.hotbar.6',    category: 'inventory', default: 'Digit6' },
    { key: 'key.hotbar.7',    category: 'inventory', default: 'Digit7' },
    { key: 'key.hotbar.8',    category: 'inventory', default: 'Digit8' },
    { key: 'key.hotbar.9',    category: 'inventory', default: 'Digit9' },

    /* ==== CREATIVE ==== */
    { key: 'key.saveToolbarActivator', category: 'creative', default: 'KeyC' },
    { key: 'key.loadToolbarActivator', category: 'creative', default: 'KeyX' },

    /* ==== SPECTATOR ==== */
    { key: 'key.spectatorOutlines', category: 'spectator', default: '' },
    { key: 'key.spectatorHotbar',   category: 'spectator', default: 'MOUSE2' }
  ];

  var CATEGORY_ORDER = [
    'movement', 'misc', 'multiplayer', 'gameplay',
    'inventory', 'creative', 'spectator'
  ];

  var CATEGORY_LABEL = {
    movement:    'key.categories.movement',
    misc:        'key.categories.misc',
    multiplayer: 'key.categories.multiplayer',
    gameplay:    'key.categories.gameplay',
    inventory:   'key.categories.inventory',
    creative:    'key.categories.creative',
    spectator:   'key.categories.spectator'
  };

  /* ==========================================================
     辅助
     ========================================================== */
  function t(key) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isEscape(e) {
    return e.key === 'Escape' ||
           e.key === 'Esc' ||
           e.code === 'Escape' ||
           e.keyCode === 27;
  }

  /* ==========================================================
     存储
     ========================================================== */
  function getCode(bind) {
    try {
      var v = localStorage.getItem(STORAGE_PREFIX + bind.key);
      return (v != null) ? v : bind.default;
    } catch (e) { return bind.default; }
  }

  function setCode(bind, code) {
    try { localStorage.setItem(STORAGE_PREFIX + bind.key, code); } catch (e) {}
  }

  function resetCode(bind) {
    try { localStorage.removeItem(STORAGE_PREFIX + bind.key); } catch (e) {}
  }

  function isDefault(bind) {
    return getCode(bind) === bind.default;
  }

  /* ==========================================================
     显示名
     ========================================================== */
  var CODE_DISPLAY = {
    'Space': 'Space',
    'Tab': 'Tab',
    'Escape': 'Esc',
    'Enter': 'Enter',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'ShiftLeft': 'Left Shift',
    'ShiftRight': 'Right Shift',
    'ControlLeft': 'Left Ctrl',
    'ControlRight': 'Right Ctrl',
    'AltLeft': 'Left Alt',
    'AltRight': 'Right Alt',
    'MetaLeft': 'Left Meta',
    'MetaRight': 'Right Meta',
    'CapsLock': 'Caps Lock',
    'Slash': '/',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': "'",
    'Comma': ',',
    'Period': '.',
    'Minus': '-',
    'Equal': '=',
    'Backquote': '`',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Insert': 'Insert',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'Page Up',
    'PageDown': 'Page Down'
  };

  function displayName(code) {
    if (!code) {
      var unk = t('key.keyboard.unknown');
      return unk === 'key.keyboard.unknown' ? 'Not Bound' : unk;
    }
   if (code.indexOf('MOUSE') === 0) {
  var n = parseInt(code.substring(5), 10);
  var mouseKey;
  if (n === 0)      mouseKey = 'key.mouse.left';
  else if (n === 1) mouseKey = 'key.mouse.right';
  else if (n === 2) mouseKey = 'key.mouse.middle';
  else              mouseKey = 'key.mouse.' + (n + 1);

  var txt = t(mouseKey);
  /* 没翻译就退回硬编码兜底 */
  return txt === mouseKey ? ('Button ' + (n + 1)) : txt;
}
    if (code.indexOf('Key') === 0 && code.length === 4) return code.substring(3);
    if (code.indexOf('Digit') === 0) return code.substring(5);
    if (code.indexOf('Numpad') === 0) return 'Num ' + code.substring(6);
    if (/^F\d+$/.test(code)) return code;
    return CODE_DISPLAY[code] || code;
  }

  /* ==========================================================
     冲突检测
     ========================================================== */
  function findCollisions(bind) {
    var code = getCode(bind);
    if (!code) return [];
    var result = [];
    for (var i = 0; i < KEYBINDS.length; i++) {
      var other = KEYBINDS[i];
      if (other === bind) continue;
      if (getCode(other) !== code) continue;
      if (isDefault(other) && isDefault(bind)) continue;
      result.push(other);
    }
    return result;
  }

  /* ==========================================================
     状态
     ========================================================== */
  var listEl = document.getElementById('keybinds-list');
  var btnResetAll = document.getElementById('btn-reset-all');
  var selectedBind = null;

  /* ==========================================================
     渲染
     ========================================================== */
  function render() {
    if (!listEl) return;
    listEl.innerHTML = '';

    for (var c = 0; c < CATEGORY_ORDER.length; c++) {
      var cat = CATEGORY_ORDER[c];
      var binds = KEYBINDS.filter(function(b) { return b.category === cat; });
      if (binds.length === 0) continue;

      var catEl = document.createElement('div');
      catEl.className = 'kb-category';
      catEl.textContent = t(CATEGORY_LABEL[cat]);
      listEl.appendChild(catEl);

      for (var i = 0; i < binds.length; i++) {
        listEl.appendChild(createEntry(binds[i]));
      }
    }

    updateResetAllState();
  }

  function createEntry(bind) {
    var code = getCode(bind);
    var collisions = findCollisions(bind);
    var hasCollision = collisions.length > 0;
    var isSelected = (selectedBind === bind);

var el = document.createElement('div');
el.className = 'kb-entry' + (hasCollision ? ' kb-has-collision' : '');

    /* --- 名称 --- */
    var nameEl = document.createElement('div');
    nameEl.className = 'kb-name';
    nameEl.textContent = t(bind.key);
    el.appendChild(nameEl);

    /* --- change 按钮 --- */
    var changeBtn = document.createElement('button');
    changeBtn.className = 'kb-change-btn';
    changeBtn.type = 'button';

    var display = displayName(code);
    var safeDisplay = escapeHtml(display);

    if (isSelected) {
      /* > xxx < ：外层黄、内层白+下划线 */
      changeBtn.innerHTML =
        '<span class="kb-col-yellow">&gt; </span>' +
        '<span class="kb-col-white-ul">' + safeDisplay + '</span>' +
        '<span class="kb-col-yellow"> &lt;</span>';
    } else if (hasCollision) {
      /* [ xxx ] ：外层黄、内层白 */
      changeBtn.innerHTML =
        '<span class="kb-col-yellow">[ </span>' +
        '<span class="kb-col-white">' + safeDisplay + '</span>' +
        '<span class="kb-col-yellow"> ]</span>';
      changeBtn.classList.add('kb-collision');

      var names = collisions.map(function(o) { return t(o.key); }).join(', ');
      var dup = t('controls.keybinds.duplicateKeybinds');
      changeBtn.title = dup.indexOf('%s') >= 0 ? dup.replace('%s', names) : dup + ' ' + names;
    } else {
      changeBtn.textContent = display;
    }

    changeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      selectedBind = bind;
      render();
    });
    el.appendChild(changeBtn);

    /* --- reset 按钮 --- */
    var resetBtn = document.createElement('button');
    resetBtn.className = 'kb-reset-btn';
    resetBtn.type = 'button';
    resetBtn.textContent = t('controls.reset');
    resetBtn.disabled = isDefault(bind);

    resetBtn.addEventListener('click', function(e) {
      e.preventDefault();
      resetCode(bind);
      selectedBind = null;
      render();
    });
    el.appendChild(resetBtn);

    return el;
  }

  /* ==========================================================
     Reset All
     ========================================================== */
  function updateResetAllState() {
    var anyNonDefault = KEYBINDS.some(function(b) { return !isDefault(b); });
    if (btnResetAll) btnResetAll.disabled = !anyNonDefault;
  }

  if (btnResetAll) {
    btnResetAll.addEventListener('click', function(e) {
      e.preventDefault();
      for (var i = 0; i < KEYBINDS.length; i++) resetCode(KEYBINDS[i]);
      selectedBind = null;
      render();
    });
  }

  /* ==========================================================
     等待输入模式
     - Esc       → 绑定到 UNKNOWN（未绑定）
     - 其它键盘   → 绑定到 e.code
     - 鼠标左中右 → 绑定到 MOUSE{n}
     ========================================================== */
  document.addEventListener('keydown', function(e) {
    if (!selectedBind) return;
    e.preventDefault();
    e.stopPropagation();

    if (isEscape(e)) {
      setCode(selectedBind, '');
    } else {
      var code = e.code || e.key || '';
      if (!code) return;
      setCode(selectedBind, code);
    }
    selectedBind = null;
    render();
  }, true);

  document.addEventListener('pointerdown', function(e) {
    if (!selectedBind) return;
    if (e.pointerType !== 'mouse') return;
    if (e.button < 0 || e.button > 2) return;
    e.preventDefault();
    e.stopPropagation();
    setCode(selectedBind, 'MOUSE' + e.button);
    selectedBind = null;
    render();
  }, true);

  /* ==========================================================
     启动
     ========================================================== */
  function boot() {
    render();
  }

  if (window.i18n && window.i18n.ready) {
    window.i18n.ready(boot);
  } else {
    boot();
  }
  document.addEventListener('i18n-ready', boot, false);
  /* ==========================================================
   对外接口 —— 供其它页面查询绑定、监听按键
   ========================================================== */
function findBindByKey(key) {
  for (var i = 0; i < KEYBINDS.length; i++) {
    if (KEYBINDS[i].key === key) return KEYBINDS[i];
  }
  return null;
}

function getBindCode(key) {
  var bind = findBindByKey(key);
  return bind ? getCode(bind) : '';
}

window.mcKeybinds = {
  /* 读当前绑定（'' = 未绑定） */
  get: function(key) {
    return getBindCode(key);
  },

  /* 手动设置（code 为空则解绑） */
  set: function(key, code) {
    var bind = findBindByKey(key);
    if (bind) setCode(bind, code || '');
  },

  /* 恢复默认 */
  reset: function(key) {
    var bind = findBindByKey(key);
    if (bind) resetCode(bind);
  },

  /* 默认绑定 */
  getDefault: function(key) {
    var bind = findBindByKey(key);
    return bind ? bind.default : '';
  },

  /* ========================================================
     监听某个绑定的"按下"
       onPressed(key, callback, options)
         options.ignoreInputs  true（默认）—— 输入框/文本域/可编辑元素聚焦时不触发
         options.ignoreRepeat  true（默认）—— 长按 repeat 不触发
     返回 dispose() 函数，调用后移除监听。

     行为：
       - 未绑定（''）→ 不响应
       - 鼠标键（'MOUSE0/1/2'）→ **不**在此处响应
           （鼠标键需要"点在哪个区域"的语义，交给调用方自己处理）
       - 键盘键 → 用 e.code 精确匹配
       - 命中时 e.preventDefault()
     ======================================================== */
  onPressed: function(key, callback, options) {
    options = options || {};
    var ignoreInputs = (options.ignoreInputs !== false);
    var ignoreRepeat = (options.ignoreRepeat !== false);

    function isInputFocused() {
      var ae = document.activeElement;
      if (!ae) return false;
      var tag = ae.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || ae.isContentEditable === true;
    }

    function onKeyDown(e) {
      var code = getBindCode(key);
      if (!code) return;                         /* 未绑定 */
      if (code.indexOf('MOUSE') === 0) return;   /* 鼠标键另处理 */
      if (e.code !== code) return;
      if (ignoreRepeat && e.repeat) return;
      if (ignoreInputs && isInputFocused()) return;

      e.preventDefault();
      try { callback(e); }
      catch (err) { console.error('[mcKeybinds] onPressed ' + key, err); }
    }

    document.addEventListener('keydown', onKeyDown, true);

    return function dispose() {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }
};
})();