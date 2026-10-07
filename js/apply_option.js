(function() {
  'use strict';

  /* ============ panoramaSpeed ============ */
  function applyPanoramaSpeed() {
    var speed = mcOptions.get('options.accessibility.panorama_speed', 1);
    window.mcPanoramaSpeed = speed;
    var cssPano = document.getElementById('pano-css');
    if (cssPano) {
      if (speed <= 0) {
        cssPano.style.animationPlayState = 'paused';
      } else {
        cssPano.style.animationPlayState = '';
        cssPano.style.animationDuration = (300 / speed) + 's';
      }
    }
  }

  /* ============ hideSplashTexts ============ */
  function applyHideSplash() {
    var hide = mcOptions.get('options.hideSplashTexts', false);
    var splash = document.getElementById('splash');
    if (!splash) return;
    if (hide) splash.classList.add('hidden');
    else      splash.classList.remove('hidden');
  }

  /* ============ menuBackgroundBlurriness ============ */
  function applyBlur() {
    var val = mcOptions.get('options.accessibility.menu_background_blurriness', 5);
    var blurPx = val * 0.5;
    var stages = [
      document.getElementById('pano-css'),
      document.getElementById('pano-canvas')
    ];
    for (var i = 0; i < stages.length; i++) {
      if (!stages[i]) continue;
      stages[i].style.filter = blurPx > 0 ? 'blur(' + blurPx + 'px)' : '';
    }
  }

  /* ============ highContrast ============ */
  function applyHighContrast() {
    var on = mcOptions.get('options.accessibility.high_contrast', false);
    if (on) document.documentElement.classList.add('hc');
    else    document.documentElement.classList.remove('hc');
  }

  /* ============ guiScale ============ */
  function applyGuiScale() {
    var val = mcOptions.get('options.guiScale', 0);
    if (val > 0) {
      window.mcGuiScaleOverride = val;
    } else {
      window.mcGuiScaleOverride = null;
    }
    if (window.mcUpdateUIScale) window.mcUpdateUIScale();
  }

  /* ============ fullscreen ============ */
  function applyFullscreen() {
    var want   = mcOptions.get('options.fullscreen', false);
    var isFull = !!document.fullscreenElement;

    if (want && !isFull) {
      var p = document.documentElement.requestFullscreen();
      if (p && p.catch) {
        p.catch(function() {
          /* 浏览器拒绝（无用户手势 / 权限）→ 回写 false */
          if (mcOptions.get('options.fullscreen', false)) {
            mcOptions.set('options.fullscreen', false);
          }
        });
      }
    } else if (!want && isFull) {
      var q = document.exitFullscreen();
      if (q && q.catch) q.catch(function(){});
    }
  }

  /* 全屏状态被浏览器改变（用户按 Esc 等）→ 同步回 options */
  document.addEventListener('fullscreenchange', function() {
    var isFull = !!document.fullscreenElement;
    var stored = mcOptions.get('options.fullscreen', false);
    if (isFull !== stored) {
      mcOptions.set('options.fullscreen', isFull);
    }
    if (window.mcUpdateUIScale) window.mcUpdateUIScale();
  });

  /* ============ 全部应用 ============ */
  function applyAll() {
    if (!window.mcOptions) return;
    applyPanoramaSpeed();
    applyHideSplash();
    applyBlur();
    applyHighContrast();
    applyGuiScale();
    /* fullscreen 不在这里做：加载时没手势会被拒绝 */
  }

  window.mcApplyOptions = applyAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }

  document.addEventListener('mc-option-change', function(e) {
    var key = e.detail.key;
    if (key === 'options.accessibility.panorama_speed')             applyPanoramaSpeed();
    else if (key === 'options.hideSplashTexts')                     applyHideSplash();
    else if (key === 'options.accessibility.menu_background_blurriness') applyBlur();
    else if (key === 'options.accessibility.high_contrast')         applyHighContrast();
    else if (key === 'options.guiScale')                            applyGuiScale();
    else if (key === 'options.fullscreen')                          applyFullscreen();
  });
})();