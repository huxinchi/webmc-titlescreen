(function() {
  'use strict';

  if (window.mcWidgets && window.mcWidgets.SwitchGrid) return;

  function t(key) {
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    return v;
  }

  /* ==========================================================
     SwitchGrid —— "标签 + 44×20 开关按钮"
     对齐 SwitchGrid.java：
       - 每行：label 左对齐，按钮右对齐（44×20）
       - 行间距 4px
       - info 挂到按钮 tooltip（原版 WorldTab 未启用 withInfoUnderneath）

     用法：
       var grid = new mcWidgets.SwitchGrid(310);
       grid.add({
         label:      'selectWorld.mapFeatures',
         info:       'selectWorld.mapFeatures.info',
         get:        function() { return state.generateStructures; },
         set:        function(v) { state.generateStructures = v; },
         activeWhen: function() { return !state.isDebug; }
       });
       container.appendChild(grid.el);
       grid.refreshStates();
     ========================================================== */
  function SwitchGrid(width) {
    this.width = width || 310;
    this.el = document.createElement('div');
    this.el.className = 'mc-switch-grid';
    this.el.style.width = this.width + 'px';
    this.items = [];

    var self = this;
    document.addEventListener('i18n-ready', function() {
      self._rebuildI18n();
    }, false);
  }

  SwitchGrid.prototype.add = function(opts) {
    opts = opts || {};

    var wrap = document.createElement('div');
    wrap.className = 'mc-switch-item';

    var row = document.createElement('div');
    row.className = 'mc-switch-row';

    var labelEl = document.createElement('div');
    labelEl.className = 'mc-switch-label';
    labelEl.textContent = t(opts.label || '');
    row.appendChild(labelEl);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mcbtn mcbtn-44';
    row.appendChild(btn);

    wrap.appendChild(row);
    this.el.appendChild(wrap);

    /* info → 按钮 tooltip（对齐原版 buttonBuilder.withTooltip） */
    if (opts.info) {
      window.mcTooltip.attach(btn, function() { return t(opts.info); });
    }

    var getState   = opts.get || function() { return false; };
    var setState   = opts.set || function() {};
    var activeWhen = opts.activeWhen || function() { return true; };

    function refresh() {
      var val = !!getState();
      var onText  = t('options.on');
      var offText = t('options.off');
      btn.textContent = val ? onText : offText;
      btn.disabled = !activeWhen();
    }

    btn.addEventListener('click', function() {
      if (btn.disabled) return;
      setState(!getState());
      refresh();
      if (window.mcPlayClick) { try { window.mcPlayClick(); } catch (e) {} }
    });

    refresh();

    this.items.push({ refresh: refresh, labelEl: labelEl, opts: opts });
    return this;
  };

  SwitchGrid.prototype.refreshStates = function() {
    for (var i = 0; i < this.items.length; i++) {
      try { this.items[i].refresh(); } catch (e) {}
    }
  };

  SwitchGrid.prototype._rebuildI18n = function() {
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.opts.label) it.labelEl.textContent = t(it.opts.label);
      it.refresh();
    }
  };

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.SwitchGrid = SwitchGrid;
})();