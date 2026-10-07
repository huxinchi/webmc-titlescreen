(function() {
  'use strict';

  var DEFAULT_ICON = 'assets/icon/world_selection/unknown_server.png';

  /* ==========================================================
     WorldSelectionList
     数据字段：
       name / folder / lastPlayed / info
       icon / join / alert
       onUpdate     每次条目渲染时调用（可动态改字段）
       onJoin / onEdit / onDelete / onRecreate / onAlertClick
     ========================================================== */
  function WorldSelectionList(container, options) {
    if (!window.mcWidgets || !window.mcWidgets.ObjectSelectionList) {
      throw new Error('WorldSelectionList: ObjectSelectionList required');
    }
    options = options || {};

    this.base = new window.mcWidgets.ObjectSelectionList(container, {
      entrySelector: '.world-entry',
      onSelect: options.onSelect || null,
      onInteract: options.onInteract || null
    });

    this.el = container;
    this.entrySelector = '.world-entry';
    this.entries = [];
  }

  WorldSelectionList.prototype.createEntry = function(world) {
    var self = this;

    /* onUpdate：每次创建条目时调用一次 */
    if (typeof world.onUpdate === 'function') {
      try { world.onUpdate.call(world); }
      catch (e) { console.error('[world] onUpdate', e); }
    }

    var el = document.createElement('div');
    el.className = 'mc-list-entry world-entry';

    var iconWrap = document.createElement('div');
    iconWrap.className = 'world-icon-wrap';

    var iconEl = document.createElement('div');
    iconEl.className = 'world-icon';
    iconEl.style.backgroundImage =
      'url("' + String(world.icon || DEFAULT_ICON).replace(/"/g, '\\"') + '")';
    iconWrap.appendChild(iconEl);

    var statusEl = document.createElement('div');
    statusEl.className = 'world-status';

    var joinEl = document.createElement('div');
    joinEl.className = 'world-join';
    if (world.join) joinEl.dataset.join = world.join;

    joinEl.addEventListener('click', function(e) {
      e.stopPropagation();
      self.base.setSelected(el);
      if (world.alert === 'error') return;
      self._fireInteract(el, world);
    });

    var alertEl = document.createElement('div');
    alertEl.className = 'world-alert';
    if (world.alert) alertEl.dataset.alert = world.alert;

    alertEl.addEventListener('mouseenter', function() {
      if (world.alert === 'error') return;
      if (!world.join) return;
      var hi = (world.join === 'marked_join')
        ? 'assets/icon/world_selection/marked_join_highlighted.png'
        : 'assets/icon/world_selection/join_highlighted.png';
      joinEl.style.backgroundImage = 'url("' + hi + '")';
    });
    alertEl.addEventListener('mouseleave', function() {
      joinEl.style.backgroundImage = '';
    });

    alertEl.addEventListener('click', function(e) {
      e.stopPropagation();
      self.base.setSelected(el);
      callHandle(world, 'onAlertClick');
      if (world.alert === 'error') return;
      self._fireInteract(el, world);
    });

    statusEl.appendChild(joinEl);
    statusEl.appendChild(alertEl);
    iconWrap.appendChild(statusEl);

    var infoEl = document.createElement('div');
    infoEl.className = 'world-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'world-name';
    nameEl.textContent = world.name || '';

    var metaEl = document.createElement('div');
    metaEl.className = 'world-meta';
    var metaText = world.folder || world.name || '';
    if (world.lastPlayed) metaText += ' (' + world.lastPlayed + ')';
    metaEl.textContent = metaText;

    var infoTextEl = document.createElement('div');
    infoTextEl.className = 'world-info-text';
    infoTextEl.textContent = world.info || '';

    infoEl.appendChild(nameEl);
    infoEl.appendChild(metaEl);
    infoEl.appendChild(infoTextEl);

    el.appendChild(iconWrap);
    el.appendChild(infoEl);

    this.base.setData(el, world);
    world._el = el;

    return el;
  };

  WorldSelectionList.prototype._fireInteract = function(el, world) {
    if (typeof this.base.onInteract === 'function') {
      this.base.onInteract(el, world);
    }
    el.dispatchEvent(new CustomEvent('interact', {
      bubbles: true,
      detail: { data: world }
    }));
  };

  WorldSelectionList.prototype.renderList = function(worlds) {
    this.el.innerHTML = '';
    this.entries = worlds || [];

    for (var i = 0; i < this.entries.length; i++) {
      this.el.appendChild(this.createEntry(this.entries[i]));
    }
    this.base.setSelected(null);
  };

  WorldSelectionList.prototype.setRows = function(worlds) {
    this.renderList(worlds);
  };

  WorldSelectionList.prototype.applyFilter = function(q) {
    q = (q || '').trim().toLowerCase();
    for (var i = 0; i < this.entries.length; i++) {
      var w = this.entries[i];
      if (!w._el) continue;
      var name   = (w.name   || '').toLowerCase();
      var folder = (w.folder || '').toLowerCase();
      var info   = (w.info   || '').toLowerCase();
      var hit = !q || name.indexOf(q) >= 0 || folder.indexOf(q) >= 0 || info.indexOf(q) >= 0;
      w._el.style.display = hit ? '' : 'none';
    }
    this.base.setSelected(null);
  };

  WorldSelectionList.prototype.getSelectedData = function() {
    return this.base.getSelectedData();
  };

  WorldSelectionList.prototype.getSelectedEl = function() {
    return this.base.getSelected();
  };

  WorldSelectionList.prototype.getSelected = function() {
    return this.base.getSelectedData();
  };

  WorldSelectionList.prototype.select = function(world) {
    var el = world && world._el;
    if (!el) return;
    this.base.setSelected(el);
  };

  WorldSelectionList.prototype.clearSelected = function() {
    this.base.setSelected(null);
  };

  function callHandle(world, name) {
    if (!world) return;
    var fn = world[name];
    if (typeof fn === 'function') fn.call(world);
  }

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.WorldSelectionList = WorldSelectionList;
})();