(function() {
  'use strict';

  /* ==========================================================
     main.js —— 按顺序同步加载通用模块
     页面特有模块（show_splash / show_realm / world_select 等）
     由页面自己在 main.js 之后按需加载
     ========================================================== */

var SCRIPTS = [
  'js/option.js',
  'js/apply_option.js',
  'js/clicksound.js',
  'js/checkbox.js',
  'js/lock_button.js',
  'js/slider.js',
  'js/cycle_button.js',
  'js/option_list.js',
  'js/object_select_list.js',
  'js/btn_back.js',
  'js/uiscale.js',
  'js/keybinds.js',
  'js/i18n.js',
  'js/narrator.js',
  'js/resourcepacks.js'
];

  var base = '';

  /* 从当前 script 标签反推根路径 */
  var self = document.currentScript;
  if (self && self.src) {
    base = self.src.replace(/js\/main\.js(\?.*)?$/, '');
  }

  for (var i = 0; i < SCRIPTS.length; i++) {
    document.write('<script src="' + base + SCRIPTS[i] + '"><\/script>');
  }
})();