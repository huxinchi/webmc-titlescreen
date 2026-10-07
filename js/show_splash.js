(function() {
  'use strict';

  var SPLASH_URL = 'assets/texts/splashes.txt';
  var EXCLUDED_HASH = 125780783;


  var splashEl = document.getElementById('splash');
  if (!splashEl) return;

  var textEl = splashEl.querySelector('.splash-text');

  /* ==========================================================
     测量文本宽度（MC 逻辑像素）
     MC 里 font.width(text) 返回 MC 逻辑像素宽度
     网页 font-size: 16px 对应 MC 8 像素字形高
     所以 measureText 返回的 px 值 ≈ MC 逻辑像素宽度（误差 <1px）
     ========================================================== */
  var measureCanvas = document.createElement('canvas');
  var measureCtx = measureCanvas.getContext('2d');

  function measureMCWidth(text) {
    measureCtx.font = '16px "Minecraft", monospace';
    return measureCtx.measureText(text).width;
  }

  /* ==========================================================
     复刻源码 textScale 公式：
       textScale = textPhase * 100 / (textWidth + 32)
     归一化到 phase = 1.75（用于 CSS 静态字号）：
       baseFontSize = 16 * 175 / (textWidth + 32)
     CSS @keyframes 再乘 phase/1.75 得到动态缩放
     ========================================================== */
  function applySplashScale(text) {
    var textWidth = measureMCWidth(text);
    var baseFontSize = 16 * 175 / (textWidth + 32);
    splashEl.style.setProperty('--splash-font-size', baseFontSize.toFixed(2) + 'px');
  }

  /* ==========================================================
     显示 / 隐藏
     ========================================================== */
  function show(text) {
    if (!text) return;
    if (textEl) textEl.textContent = text;
    applySplashScale(text);
    splashEl.classList.add('visible');
  }

  function hide() {
    splashEl.classList.remove('visible');
  }

  /* ==========================================================
     节日特殊标语
     ========================================================== */
  var CHRISTMAS = 'Merry X-mas!';
  var NEW_YEAR  = 'Happy new year!';
  var HALLOWEEN = 'OOoooOOOoooo! Spooky!';

  function getHolidaySplash() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    if (m === 12 && day === 24) return CHRISTMAS;
    if (m === 1  && day === 1)  return NEW_YEAR;
    if (m === 10 && day === 31) return HALLOWEEN;
    return null;
  }

  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m[2]) : '';
  }

  function javaHashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  /* ==========================================================
     启动：等字体加载完再测量
     ========================================================== */
  function main() {
    /* 1. 节日优先 */
    var holiday = getHolidaySplash();
    if (holiday) { show(holiday); return; }

    /* 2. 加载 splashes.txt */
    fetch(SPLASH_URL)
      .then(function(r) {
        if (!r.ok) throw new Error('fetch failed');
        return r.text();
      })
      .then(function(text) {
        var lines = text.split('\n')
          .map(function(s) { return s.trim(); })
          .filter(function(s) { return s.length > 0; })
          .filter(function(s) { return javaHashCode(s) !== EXCLUDED_HASH; });

        if (lines.length === 0) { hide(); return; }

        /* 3. 用户名彩蛋 */
var username = (window.mcOptions && window.mcOptions.get('username', '')) || '';
        var firstIndex = Math.floor(Math.random() * lines.length);

        if (username && firstIndex === 42) {
          show(username.toUpperCase() + ' IS YOU');
          return;
        }

        /* 4. 普通随机 */
        var pick = Math.floor(Math.random() * lines.length);
        show(lines[pick]);
      })
      .catch(function() {
        /* fetch 失败保留 HTML 里的默认标语 */
        var fallback = textEl ? textEl.textContent : '';
        if (fallback) applySplashScale(fallback);
        splashEl.classList.add('visible');
      });
  }

  /* 等 Minecraft 字体加载完，再测量宽度 */
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Minecraft"').then(main).catch(main);
  } else {
    main();
  }
})();