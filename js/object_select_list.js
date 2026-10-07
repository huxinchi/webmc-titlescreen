(function() {
  'use strict';

  /* ==========================================================
     ObjectSelectionList
     - 单击选中，双击 onInteract
     - 派发 'select' / 'interact' / 'listchange' 事件
     ========================================================== */
  function ObjectSelectionList(container, options) {
    if (!container) throw new Error('ObjectSelectionList: container required');
    options = options || {};

    this.el = container;
    this.entrySelector = options.entrySelector || '.mc-list-entry';
    this.onSelect = options.onSelect || null;
    this.onInteract = options.onInteract || null;
    this.selected = null;

    var self = this;

    container.addEventListener('click', function(e) {
      var entry = e.target.closest(self.entrySelector);
      if (!entry || !container.contains(entry)) return;
      self.setSelected(entry);
      if (typeof self.onSelect === 'function') self.onSelect(entry, entry._data);
      entry.dispatchEvent(new CustomEvent('select', {
        bubbles: true,
        detail: { data: entry._data }
      }));
    });

    container.addEventListener('dblclick', function(e) {
      var entry = e.target.closest(self.entrySelector);
      if (!entry || !container.contains(entry)) return;
      self.setSelected(entry);
      if (typeof self.onInteract === 'function') self.onInteract(entry, entry._data);
      entry.dispatchEvent(new CustomEvent('interact', {
        bubbles: true,
        detail: { data: entry._data }
      }));
    });
  }

  ObjectSelectionList.prototype.setSelected = function(entry) {
    var all = this.el.querySelectorAll(this.entrySelector);
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle('selected', all[i] === entry);
    }
    this.selected = entry || null;

    /* 源码 centerScrollOn(getSelected())：让选中条目居中 */
    if (entry) {
      var elRect = this.el.getBoundingClientRect();
      var entryRect = entry.getBoundingClientRect();
      var currentScroll = this.el.scrollTop;
      var entryTopInContent = entryRect.top - elRect.top + currentScroll;
      var target = entryTopInContent + entryRect.height / 2 - this.el.clientHeight / 2;
      this.el.scrollTop = Math.max(0, target);
    }

    this.el.dispatchEvent(new CustomEvent('listchange', {
      bubbles: true,
      detail: { selected: this.selected, data: this.selected ? this.selected._data : null }
    }));
  };

  ObjectSelectionList.prototype.getSelected = function() { return this.selected; };
  ObjectSelectionList.prototype.getSelectedData = function() {
    return this.selected ? this.selected._data : null;
  };
  ObjectSelectionList.prototype.clearSelected = function() { this.setSelected(null); };
  ObjectSelectionList.prototype.setData = function(entry, data) { entry._data = data; };

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.ObjectSelectionList = ObjectSelectionList;
})();