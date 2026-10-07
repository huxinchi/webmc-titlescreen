(function() {
  'use strict';

  if (window.mcWidgets && window.mcWidgets.SwitchGrid) return;

  function t(key) {
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    return v;
  }

  /* ==========================================================
     SwitchGrid —— "标签 + 44×20 开关按钮"
     对齐 SwitchGrid.java

     用法：
       var grid = new mcWidgets.SwitchGrid(310, {
         infoUnderneath: true,   // info 显示在下方（默认 false = tooltip）
         maxInfoRows:    2,      // info 最多几行
         rowSpacing:     4       // 行间距
       });
       grid.add({ label, info, get, set, activeWhen });
       container.appendChild(grid.el);
       grid.refreshStates();
     ========================================================== */
  function SwitchGrid(width, opts) {
    opts = opts || {};
    this.width          = width || 310;
    this.rowSpacing     = (typeof opts.rowSpacing === 'number') ? opts.rowSpacing : 4;
    this.infoUnderneath = !!opts.infoUnderneath;
    this.maxInfoRows    = (typeof opts.maxInfoRows === 'number') ? opts.maxInfoRows : 2;

    this.el = document.createElement('div');
    this.el.className = 'mc-switch-grid';
    this.el.style.width = this.width + 'px';
    this.el.style.gap   = this.rowSpacing + 'px';
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

    /* info 行 / tooltip */
    var useUnderneath = (typeof opts.infoUnderneath === 'boolean')
      ? opts.infoUnderneath
      : this.infoUnderneath;

    var infoEl = null;
    if (opts.info && useUnderneath) {
      infoEl = document.createElement('div');
      infoEl.className = 'mc-switch-info';
      infoEl.textContent = t(opts.info);
      infoEl.style.maxHeight = (this.maxInfoRows * 12) + 'px';
      wrap.appendChild(infoEl);
    } else if (opts.info) {
      window.mcTooltip.attach(btn, function() { return t(opts.info); });
    }

    this.el.appendChild(wrap);

    var getState   = opts.get || function() { return false; };
    var setState   = opts.set || function() {};
    var activeWhen = opts.activeWhen || function() { return true; };

    function refresh() {
      var val = !!getState();
      btn.textContent = val ? t('options.on') : t('options.off');
      btn.disabled = !activeWhen();
    }

    btn.addEventListener('click', function() {
      if (btn.disabled) return;
      setState(!getState());
      refresh();
      if (window.mcPlayClick) { try { window.mcPlayClick(); } catch (e) {} }
    });

    refresh();

    this.items.push({ refresh: refresh, labelEl: labelEl, infoEl: infoEl, opts: opts });
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
      if (it.opts.info && it.infoEl) it.infoEl.textContent = t(it.opts.info);
      it.refresh();
    }
  };

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.SwitchGrid = SwitchGrid;
})();