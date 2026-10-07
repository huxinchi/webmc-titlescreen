(function() {
  'use strict';

  /* ==========================================================
     Narrator —— Web Speech API 朗读
     状态来自 options.narrator：off / all / chat / system
     快捷键：Ctrl+B（macOS Cmd+B），受 narrator_hotkey 控制
     ========================================================== */

  var current   = 'off';
  var supported = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);

  function t(key) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
  }

  function readOption() {
    if (window.mcOptions) return window.mcOptions.get('options.narrator', 'off');
    return 'off';
  }

  /* ---------- 朗读 ---------- */
  function speak(text) {
    if (!supported || !text || current === 'off') return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = (document.documentElement.getAttribute('lang') || 'en-US').replace('_', '-');
      u.rate = 1.0;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function narrateEl(el) {
    if (!el || current === 'off') return;
    var text = '';

    var k = el.getAttribute && el.getAttribute('data-i18n');
    if (k) text = t(k);

    if (!text && el.getAttribute) text = el.getAttribute('aria-label') || '';
    if (!text && el.getAttribute) text = el.getAttribute('placeholder') || '';
    if (!text) text = (el.textContent || '').trim();

    if (text) speak(text);
  }

  function isInteractive(el) {
    if (!el || !el.matches) return false;
    return el.matches('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  }

  /* ---------- 事件 ---------- */
  function bind() {
    /* 聚焦朗读 */
    document.addEventListener('focusin', function(e) {
      if (current === 'off') return;
      if (!isInteractive(e.target)) return;
      narrateEl(e.target);
    }, true);

    /* 点击朗读（仅 all） */
    document.addEventListener('click', function(e) {
      if (current !== 'all') return;
      var el = e.target && e.target.closest
        ? e.target.closest('a, button, .mcbtn, .world-entry')
        : null;
      if (el) narrateEl(el);
    }, false);

    /* 选项变化时朗读新值 */
    document.addEventListener('mc-option-change', function(e) {
      var detail = e.detail || {};

      /* 状态同步 */
      if (detail.key === 'options.narrator') {
        current = readOption();
        if (current === 'off' && supported) {
          try { speechSynthesis.cancel(); } catch (er) {}
        }
        return;
      }

      if (current !== 'all' && current !== 'system') return;
      if (!detail.key) return;

      var label = t(detail.key);
      var val   = detail.value;
      if (typeof val === 'boolean') {
        val = t(val ? 'options.on' : 'options.off');
      } else if (typeof val === 'number') {
        val = String(val);
      }
      var generic = t('options.generic_value');
      if (generic === 'options.generic_value') generic = '%s: %s';
      speak(generic.replace('%s', label).replace('%s', val));
    }, false);

    /* 页面标题朗读 */
    document.addEventListener('i18n-ready', function() {
      if (current === 'off') return;
      var title = document.querySelector(
        '.options-title, .acc-title, .lang-title, .font-title, .credits-title, .world-title'
      );
      if (title) narrateEl(title);
    }, false);
  }

  /* ---------- 快捷键 ---------- */
  function bindHotkey() {
    document.addEventListener('keydown', function(e) {
      if (!window.mcOptions) return;
      if (!window.mcOptions.get('options.accessibility.narrator_hotkey', true)) return;

      var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
      var mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key !== 'b' && e.key !== 'B') return;

      e.preventDefault();

      var values = ['off', 'all', 'chat', 'system'];
      var idx = values.indexOf(current);
      if (idx < 0) idx = 0;
      var next = values[(idx + 1) % values.length];

      window.mcOptions.set('options.narrator', next);
      current = next;

      /* 反馈：朗读 "Narrator: xxx" */
      if (next !== 'off') {
        var generic = t('options.generic_value');
        if (generic === 'options.generic_value') generic = '%s: %s';
        speak(generic
          .replace('%s', t('options.narrator'))
          .replace('%s', t('options.narrator.' + next)));
      }
    }, true);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    current = readOption();
    bind();
    bindHotkey();

    if (window.i18n && window.i18n.ready) {
      window.i18n.ready(function() {
        current = readOption();
        if (current !== 'off') {
          var title = document.querySelector(
            '.options-title, .acc-title, .lang-title, .font-title, .credits-title, .world-title'
          );
          if (title) narrateEl(title);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- 对外 ---------- */
  window.mcNarrator = {
    speak: speak,
    narrate: narrateEl,
    isEnabled: function() { return current !== 'off'; },
    getMode:   function() { return current; },
    isSupported: function() { return supported; }
  };
})();