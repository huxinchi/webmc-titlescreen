(function() {
  'use strict';

  /* ==========================================================
     AccessibilityOptionsScreen —— 数据部分
     键名 / 默认值严格来自 Options.java
     渲染交给 mcWidgets.OptionsList
     ========================================================== */

  var OPTIONS = {
    'options.narrator': {
      type: 'enum',
      values: ['off', 'all', 'chat', 'system'], value: 'off',
      valueKey: 'options.narrator.'
    },
    'options.controls': { type: 'button', href: 'controls.html' },

    'options.showSubtitles': { type: 'boolean', value: false },
    'options.accessibility.high_contrast': { type: 'boolean', value: false },

    'options.accessibility.menu_background_blurriness': {
      type: 'slider', min: 0, max: 10, step: 1, value: 5, format: 'intOrOff'
    },
    'options.accessibility.text_background_opacity': {
      type: 'slider', min: 0, max: 1, step: 0.1, value: 0.5, format: 'percent'
    },

    'options.accessibility.text_background': { type: 'chatBg', value: true },

    'options.chat.opacity': {
      type: 'slider', min: 0, max: 1, step: 0.1, value: 1, format: 'chatOpacity'
    },
    'options.chat.line_spacing': {
      type: 'slider', min: 0, max: 1, step: 0.1, value: 0, format: 'percent'
    },
    'options.chat.delay': {
      type: 'slider', min: 0, max: 6, step: 0.1, value: 0, format: 'chatDelay'
    },
    'options.notifications.display_time': {
      type: 'slider', min: 0.5, max: 10, step: 0.5, value: 1, format: 'multiplier'
    },

    'options.viewBobbing': { type: 'boolean', value: true },

    'options.screenEffectScale':    { type: 'slider', min: 0, max: 1, step: 0.1, value: 1,    format: 'percentOrOff' },
    'options.fovEffectScale':       { type: 'slider', min: 0, max: 1, step: 0.1, value: 1,    format: 'percentOrOff' },
    'options.darknessEffectScale':  { type: 'slider', min: 0, max: 1, step: 0.1, value: 1,    format: 'percentOrOff' },
    'options.damageTiltStrength':   { type: 'slider', min: 0, max: 1, step: 0.1, value: 1,    format: 'percentOrOff' },
    'options.glintSpeed':           { type: 'slider', min: 0, max: 1, step: 0.1, value: 0.5,  format: 'percentOrOff' },
    'options.glintStrength':        { type: 'slider', min: 0, max: 1, step: 0.1, value: 0.75, format: 'percentOrOff' },

    'options.hideLightningFlashes': { type: 'boolean', value: false },
    'options.darkMojangStudiosBackgroundColor': { type: 'boolean', value: false },

    'options.accessibility.panorama_speed': {
      type: 'slider', min: 0, max: 1, step: 0.1, value: 1, format: 'percent'
    },
    'options.hideSplashTexts': { type: 'boolean', value: false },
    'options.accessibility.narrator_hotkey': { type: 'boolean', value: true },
    'options.rotateWithMinecart': { type: 'boolean', value: false, disabled: true },
    'options.accessibility.high_contrast_block_outline': { type: 'boolean', value: false }
  };

  var ROWS = [
    ['options.narrator',                  'options.controls'],
    ['options.showSubtitles',             'options.accessibility.high_contrast'],
    ['options.accessibility.menu_background_blurriness', 'options.accessibility.text_background_opacity'],
    ['options.accessibility.text_background', 'options.chat.opacity'],
    ['options.chat.line_spacing',         'options.chat.delay'],
    ['options.notifications.display_time','options.viewBobbing'],
    ['options.screenEffectScale',         'options.fovEffectScale'],
    ['options.darknessEffectScale',       'options.damageTiltStrength'],
    ['options.glintSpeed',                'options.glintStrength'],
    ['options.hideLightningFlashes',      'options.darkMojangStudiosBackgroundColor'],
    ['options.accessibility.panorama_speed', 'options.hideSplashTexts'],
    ['options.accessibility.narrator_hotkey','options.rotateWithMinecart'],
    ['options.accessibility.high_contrast_block_outline']
  ];

  var listEl = document.getElementById('acc-list');
  if (listEl && window.mcWidgets && window.mcWidgets.OptionsList) {
    new window.mcWidgets.OptionsList(listEl, {
      options: OPTIONS,
      rows: ROWS
    });
  }
})();