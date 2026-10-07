(function() {
  'use strict';

  if (window.mcTooltip) return;

  var ROOT_ID = 'mc-tooltip';

  var currentEl      = null;
  var currentMessage = null;

  function t(key) {
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    return v;
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      if (document.body) {
        document.body.appendChild(root);
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          if (!document.getElementById(ROOT_ID)) {
            document.body.appendChild(root);
          }
        }, { once: true });
      }
    }
    return root;
  }

  function positionAt(clientX, clientY) {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var rect = root.getBoundingClientRect();
    var x = clientX + 12;
    var y = clientY + 8;
    if (x + rect.width > window.innerWidth - 4) x = clientX - rect.width - 12;
    if (y + rect.height > window.innerHeight - 4) y = clientY - rect.height - 8;
    if (x < 4) x = 4;
    if (y < 4) y = 4;
    root.style.left = x + 'px';
    root.style.top  = y + 'px';
  }

  function show(message, clientX, clientY) {
    if (message == null) return;
    var text = String(message);
    if (!text) return;

    var root = ensureRoot();
    root.textContent = text;
    root.classList.add('visible');
    positionAt(clientX, clientY);
  }

  function hide() {
    var root = document.getElementById(ROOT_ID);
    if (root) root.classList.remove('visible');
    currentEl = null;
    currentMessage = null;
  }

  /* 从元素上取 tooltip 文本 */
  function getMessage(el) {
    if (!el) return null;
    if (el._mcTooltipFn) {
      try {
        var v = el._mcTooltipFn();
        return v == null ? null : String(v);
      } catch (e) { return null; }
    }
    if (el.dataset.i18nTooltip) return t(el.dataset.i18nTooltip);
    if (el.dataset.tooltip)     return el.dataset.tooltip;
    return null;
  }

  function findOwner(el) {
    if (!el || !el.closest) return null;
    return el.closest('[data-tooltip], [data-i18n-tooltip], .mc-has-tooltip');
  }

  /* ==========================================================
     全局事件委托
     ========================================================== */
  document.addEventListener('mouseover', function(e) {
    var el = findOwner(e.target);
    if (!el) return;
    if (el === currentEl) return;

    var msg = getMessage(el);
    if (!msg) return;

    currentEl = el;
    currentMessage = msg;
    show(msg, e.clientX, e.clientY);
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!currentEl) return;
    if (!currentMessage) return;
    positionAt(e.clientX, e.clientY);
  }, true);

  document.addEventListener('mouseout', function(e) {
    var el = findOwner(e.target);
    if (!el) return;
    if (el !== currentEl) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    hide();
  }, true);

  /* 页面滚动 / 触摸时隐藏 */
  document.addEventListener('scroll', hide, true);
  document.addEventListener('touchstart', hide, true);

  /* i18n 就绪后若正在显示 tooltip，重新计算文本 */
  document.addEventListener('i18n-ready', function() {
    if (!currentEl) return;
    var msg = getMessage(currentEl);
    if (!msg) { hide(); return; }
    currentMessage = msg;
    var root = document.getElementById(ROOT_ID);
    if (root) root.textContent = msg;
  }, false);

  /* ==========================================================
     对外
     ========================================================== */
  window.mcTooltip = {
    show: show,
    hide: hide,

    /* attach(el, messageOrFn)
       - 字符串 → 显示该文本
       - 函数   → 每次悬停时调用，取返回值 */
    attach: function(el, messageOrFn) {
      if (!el) return;
      el.classList.add('mc-has-tooltip');
      if (typeof messageOrFn === 'function') {
        el._mcTooltipFn = messageOrFn;
      } else {
        el.dataset.tooltip = String(messageOrFn == null ? '' : messageOrFn);
      }
    },

    detach: function(el) {
      if (!el) return;
      el.classList.remove('mc-has-tooltip');
      delete el.dataset.tooltip;
      delete el.dataset.i18nTooltip;
      delete el._mcTooltipFn;
      if (el === currentEl) hide();
    }
  };

})();