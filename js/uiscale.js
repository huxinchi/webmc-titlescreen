(function() {
  'use strict';

  function updateUIScale() {
    var scale;
    var override = window.mcGuiScaleOverride;

    if (override != null && override > 0) {
      /* 手动：1~4 直接作为倍率 */
      scale = Math.max(0.5, Math.min(override, 4.0));
    } else {
      /* 自动（guiScale=0）：原逻辑 */
      var BASE_W = 640;
      var BASE_H = 480;
      var raw = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
      scale = Math.max(0.75, Math.min(raw, 2.0));
    }

    document.documentElement.style.setProperty('--ui-scale', scale.toFixed(3));
  }

  window.mcUpdateUIScale = updateUIScale;

  window.addEventListener('resize', updateUIScale);
  window.addEventListener('orientationchange', updateUIScale);
  updateUIScale();
})();