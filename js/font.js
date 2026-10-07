(function() {
  'use strict';

  /* ==========================================================
     字体管理 —— 替换 main.css 里的 @font-face 逻辑
     main.css 里的 @font-face 保持不变（作为首次渲染的 fallback）
     本脚本动态注入一个同名的 @font-face，加载时机更晚，会覆盖它
     这样切换字体时不用改 CSS

     目前 assets/font/ 里只有 minecraft.ttf
     想加新字体：
       1. 把字体文件放到 assets/font/ 下
       2. 调 mcFont.register('名字', '路径')
          或者在下面 FONTS 里直接加一项
     ========================================================== */

  var STORAGE_CURRENT = 'mc_currentFont';
  var STYLE_ID        = 'mc-font-face';
  var DEFAULT_NAME    = 'minecraft';

  /* 已注册字体表 —— 目前只有默认的 minecraft.ttf */
  var FONTS = {
    'minecraft': 'assets/font/minecraft.ttf'
  };

  function getSaved() {
    try { return localStorage.getItem(STORAGE_CURRENT); } catch (e) { return null; }
  }
  function save(name) {
    try { localStorage.setItem(STORAGE_CURRENT, name); } catch (e) {}
  }

  function pickName() {
    var saved = getSaved();
    if (saved && FONTS[saved]) return saved;
    return DEFAULT_NAME;
  }

  /* 注入 @font-face 到 <head> 末尾（后加载会覆盖 main.css 里的） */
  function inject(src) {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      var head = document.head || document.documentElement;
      head.appendChild(el);
    }
    el.textContent =
      '@font-face {' +
      '  font-family: "Minecraft";' +
      '  src: url("' + src + '") format("truetype");' +
      '  font-weight: normal;' +
      '  font-style: normal;' +
      '  font-display: swap;' +
      '}';
  }

  function apply() {
    inject(FONTS[pickName()]);
  }

  /* ==========================================================
     对外接口
     ========================================================== */
  window.mcFont = {
    /* 立即应用当前字体 */
    apply: apply,

    /* 当前字体名 */
    getCurrent: pickName,

    /* 切换当前字体（name 必须在 FONTS 里） */
    setCurrent: function(name) {
      if (!FONTS[name]) return false;
      save(name);
      apply();
      return true;
    },

    /* 注册新字体（name, url）—— 预留的添加接口 */
    register: function(name, url) {
      if (!name || !url) return false;
      FONTS[name] = url;
      return true;
    },

    /* 列出所有已注册字体 { name: url } */
    list: function() {
      var copy = {};
      for (var k in FONTS) {
        if (Object.prototype.hasOwnProperty.call(FONTS, k)) copy[k] = FONTS[k];
      }
      return copy;
    }
  };

  /* 页面加载即应用 */
  apply();
})();