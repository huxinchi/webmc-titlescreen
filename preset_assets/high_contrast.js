/* ==========================================================
   High Contrast —— 高对比度
   影响：给 <html> 加 .hc 类
   ========================================================== */
(window.__mcResourcePacks = window.__mcResourcePacks || {})['high_contrast'] = {
  id:            'high_contrast',
  title:         'High Contrast',
  description:   'Enhances the UI contrast of Minecraft',
  source:        'feature',
  compatibility: 'compatible',

  apply:   function() { document.documentElement.classList.add('hc');},
  unapply: function() { document.documentElement.classList.remove('hc'); }
};
//  { id: 'high_contrast', file: 'high_contrast.js', "default": false }