(function() {
  'use strict';

  /* ==========================================================
     OptionsScreen
     键名严格来自 OptionsScreen.java：
       TITLE = "options.title"
       SKIN_CUSTOMIZATION = "options.skinCustomisation"
       SOUNDS = "options.sounds"
       VIDEO = "options.video"
       CONTROLS = "options.controls"
       LANGUAGE = "options.language"
       CHAT = "options.chat"
       RESOURCEPACK = "options.resourcepack"
       ACCESSIBILITY = "options.accessibility"
       TELEMETRY = "options.telemetry"
       CREDITS_AND_ATTRIBUTION = "options.credits_and_attribution"
       online button = "options.online"
     ========================================================== */

  function t(key) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
  }
  function tArgs(key, arg) {
    var s = t(key);
    return s.indexOf('%s') >= 0 ? s.replace('%s', arg) : s;
  }

  /* 源码：helper.addChild(...) 按顺序成对排布 */
  var LINKS = [
    ['options.skinCustomisation',       'skin.html'],
    ['options.sounds',                  'sound.html'],
    ['options.video',                   'video.html'],
    ['options.controls',                'controls.html'],
    ['options.language',                'lang.html'],
    ['options.chat',                    'chat.html'],
    ['options.resourcepack',            'resourcepack.html'],
    ['options.accessibility',           'accessibility.html'],
    ['options.telemetry',               'telemetry.html'],
    ['options.credits_and_attribution', 'credits.html']
  ];

  var gridEl = document.getElementById('options-grid');

  function render() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (var i = 0; i < LINKS.length; i += 2) {
      var row = document.createElement('div');
      row.className = 'mc-options-row';

      for (var c = 0; c < 2; c++) {
        var link = LINKS[i + c];
        if (!link) break;

        var a = document.createElement('a');
        a.className = 'mcbtn mcbtn-150';
        a.href = link[1];
        a.textContent = t(link[0]);
        row.appendChild(a);
      }

      gridEl.appendChild(row);
    }
  }

  /* ==========================================================
     FOV slider
     源码：options.fov()，IntRange(30, 110)，默认 70
     值文本：
       70  → "options.fov.min"
       110 → "options.fov.max"
       其他 → 数字
     ========================================================== */
  function setupFov() {
    var slider = document.getElementById('fov-slider');
    if (!slider || slider.__inited) return;
    slider.__inited = true;

    var labelEl = slider.querySelector('.mc-options-slider-label');

    function labelFor(v) {
      var intV = Math.round(v);
      var text;
      if (intV === 70)       text = t('options.fov.min');
      else if (intV === 110) text = t('options.fov.max');
      else                   text = String(intV);

      var generic = t('options.generic_value');
      if (generic === 'options.generic_value') generic = '%s: %s';
      return generic.replace('%s', t('options.fov')).replace('%s', text);
    }

    var initV = window.mcOptions.get('options.fov', 70);
    slider.dataset.value = initV;
    labelEl.textContent = labelFor(initV);

    slider.addEventListener('slide', function(e) {
      window.mcOptions.set('options.fov', e.detail.value);
      labelEl.textContent = labelFor(e.detail.value);
    });
  }

  /* ==========================================================
     启动
     ========================================================== */
  function boot() {
    render();
    setupFov();

    if (window.mcWidgets && window.mcWidgets.initAllSliders) {
      window.mcWidgets.initAllSliders();
    }

    if (window.i18n && window.i18n.ready) {
      window.i18n.ready(function() {
        render();
        setupFov();
        if (window.mcWidgets && window.mcWidgets.initAllSliders) {
          window.mcWidgets.initAllSliders();
        }
      });
    }

    document.addEventListener('i18n-ready', function() {
      render();
      /* slider label 只更新文本，不重建 slider */
      var slider = document.getElementById('fov-slider');
      if (slider) {
        var v = parseFloat(slider.dataset.value || '70');
        var labelEl = slider.querySelector('.mc-options-slider-label');
        if (labelEl) {
          var generic = t('options.generic_value');
          if (generic === 'options.generic_value') generic = '%s: %s';
          var intV = Math.round(v);
          var text = intV === 70 ? t('options.fov.min')
                   : intV === 110 ? t('options.fov.max')
                   : String(intV);
          labelEl.textContent = generic.replace('%s', t('options.fov')).replace('%s', text);
        }
      }
    }, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();