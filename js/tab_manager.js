(function() {
  'use strict';

  if (window.mcWidgets && window.mcWidgets.TabManager) return;

  function t(key) {
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    return v;
  }

  /* ==========================================================
     TabManager —— 管理当前选中 tab
     对齐 net.minecraft.client.gui.components.tabs.TabManager
     ========================================================== */
  function TabManager(options) {
    options = options || {};
    this.onSelected   = options.onSelected   || function() {};
    this.onDeselected = options.onDeselected || function() {};
    this.currentTab   = null;
    this.tabArea      = null;
  }

  TabManager.prototype.setTabArea = function(area) {
    this.tabArea = area;
    if (this.currentTab && typeof this.currentTab.doLayout === 'function') {
      this.currentTab.doLayout(area);
    }
  };

  TabManager.prototype.getCurrentTab = function() {
    return this.currentTab;
  };

  TabManager.prototype.setCurrentTab = function(tab, playSound) {
    if (this.currentTab === tab) return;

    var oldTab = this.currentTab;

    if (oldTab && typeof oldTab.hide === 'function') oldTab.hide();

    this.currentTab = tab;

    if (tab && typeof tab.show === 'function') tab.show();

    if (this.tabArea && tab && typeof tab.doLayout === 'function') {
      tab.doLayout(this.tabArea);
    }

    if (playSound && window.mcPlayClick) {
      try { window.mcPlayClick(); } catch (e) {}
    }

    this.onDeselected(oldTab);
    this.onSelected(this.currentTab);
  };

  /* ==========================================================
     Tab —— 单个标签页
     content 是一个 DOM 元素（默认隐藏，选中时显示）
     ========================================================== */
function Tab(opts) {
  opts = opts || {};
  this.title      = (opts.title != null) ? String(opts.title) : '';
  this.contentEl  = opts.content || null;
  /* 不自动加 class —— 用户自己指定（如 .cw-tab-content） */
}
  Tab.prototype.getTabTitle = function() {
    return this.title;
  };

  Tab.prototype.show = function() {
    if (this.contentEl) {
      this.contentEl.classList.add('active');
    }
  };

  Tab.prototype.hide = function() {
    if (this.contentEl) {
      this.contentEl.classList.remove('active');
    }
  };

  /* ==========================================================
     布局：水平居中，垂直方向上 1/6 处
     对齐 GridLayoutTab.doLayout -> FrameLayout.alignInRectangle(0.5, 0.1667)
     ========================================================== */
  Tab.prototype.doLayout = function(area) {
    if (!this.contentEl) return;
    var padTop = Math.round((area.height || 0) / 6);
    this.contentEl.style.paddingTop = padTop + 'px';
  };

  /* ==========================================================
     MenuTabBar —— 顶部 tab 切换栏
     对齐 MenuTabBar.java
     ========================================================== */
  function MenuTabBar(tabManager, opts) {
    opts = opts || {};

    var self = this;
    this.manager = tabManager;
    this.tabs    = opts.tabs || [];

    this.el = document.createElement('div');
    this.el.className = 'mc-tab-bar';

    this.inner = document.createElement('div');
    this.inner.className = 'mc-tab-bar-inner';
    this.el.appendChild(this.inner);

    this.buttons = [];
    this.tabs.forEach(function(tab, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mc-tab-button';
      btn.dataset.index = String(i);
      btn.textContent = t(tab.title);
      btn.addEventListener('click', function() {
        self.selectTab(i, true);
      });
      self.buttons.push(btn);
      self.inner.appendChild(btn);
    });

    document.addEventListener('i18n-ready', function() {
      self.tabs.forEach(function(tab, i) {
        if (self.buttons[i]) self.buttons[i].textContent = t(tab.title);
      });
    }, false);

    if (this.tabs.length > 0) {
      /* 静默选中第一个 */
      this.selectTab(0, false);
    }
  }

  MenuTabBar.prototype.selectTab = function(index, playSound) {
    if (index < 0 || index >= this.tabs.length) return;
    var tab = this.tabs[index];
    this.manager.setCurrentTab(tab, playSound);
    this._syncButtons();
  };

  MenuTabBar.prototype._syncButtons = function() {
    var current = this.manager.getCurrentTab();
    for (var i = 0; i < this.buttons.length; i++) {
      var tab = this.tabs[i];
      this.buttons[i].classList.toggle('selected', tab === current);
    }
  };

  /* 计算每个 tab 宽度并应用
     对齐 MenuTabBar.arrangeElements：
       tabsWidth = min(400, width) - 28
       tabWidth  = roundToward(tabsWidth / tabCount, 2) */
  MenuTabBar.prototype.arrangeElements = function(width) {
    if (!this.tabs.length) return;
    var avail = Math.min(400, width) - 28;
    var per   = Math.floor(avail / this.tabs.length / 2) * 2;
    if (per < 40) per = 40;

    for (var i = 0; i < this.buttons.length; i++) {
      this.buttons[i].style.width = per + 'px';
    }
    this.inner.style.width = (per * this.tabs.length) + 'px';
  };

  /* ==========================================================
     对外
     ========================================================== */
  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.TabManager = TabManager;
  window.mcWidgets.Tab        = Tab;
  window.mcWidgets.MenuTabBar = MenuTabBar;

})();