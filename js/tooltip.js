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

  /* ==========================================================
     MC § 码 → HTML
     ========================================================== */
  var COLOR_CODES = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
  };

  function mcTextToHtml(text) {
    var out = '';
    var i = 0;
    var openSpan = false;
    while (i < text.length) {
      var c = text[i];
      if (c === '§' && i + 1 < text.length) {
        var code = text[i + 1].toLowerCase();
        if (COLOR_CODES[code]) {
          if (openSpan) { out += '</span>'; openSpan = false; }
          out += '<span style="color:' + COLOR_CODES[code] + '">';
          openSpan = true;
        } else if (code === 'r') {
          if (openSpan) { out += '</span>'; openSpan = false; }
        }
        i += 2;
        continue;
      }
      if (c === '<')      out += '&lt;';
      else if (c === '>') out += '&gt;';
      else if (c === '&') out += '&amp;';
      else                out += c;
      i++;
    }
    if (openSpan) out += '</span>';
    return out;
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
    root.innerHTML = mcTextToHtml(text);
    root.classList.add('visible');
    positionAt(clientX, clientY);
  }

  function hide() {
    var root = document.getElementById(ROOT_ID);
    if (root) root.classList.remove('visible');
    currentEl = null;
    currentMessage = null;
  }

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

  document.addEventListener('scroll', hide, true);
  document.addEventListener('touchstart', hide, true);

  document.addEventListener('i18n-ready', function() {
    if (!currentEl) return;
    var msg = getMessage(currentEl);
    if (!msg) { hide(); return; }
    currentMessage = msg;
    var root = document.getElementById(ROOT_ID);
    if (root) root.innerHTML = mcTextToHtml(msg);
  }, false);

  /* ==========================================================
     对外 API
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