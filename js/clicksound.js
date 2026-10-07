(function() {
  'use strict';

  var base = document.getElementById('sfx-click');
  if (!base) return;
  if (base.__sfxBound) return;
  base.__sfxBound = true;

  var __bootAt = Date.now();

  var SFX_SELECTOR = '.mcbtn, .world-entry, .world-join, .world-alert, .mc-lock-btn, .mc-checkbox';
  var INPUT_SELECTOR = '.mc-input';

  var lastPlayTime = 0;
  var MIN_INTERVAL = 150;
  var BOOT_GRACE   = 500;

  function getVolume() {
    var master = 1, ui = 1;
    if (window.mcOptions) {
      master = window.mcOptions.get('soundCategory.master', 1);
      ui     = window.mcOptions.get('soundCategory.ui', 1);
    }
    master = Math.max(0, Math.min(1, Number(master) || 0));
    ui     = Math.max(0, Math.min(1, Number(ui)     || 0));
    return 0.7 * master * ui;
  }

  function play() {
    var now = Date.now();
    if (now - __bootAt < BOOT_GRACE) return;
    if (now - lastPlayTime < MIN_INTERVAL) return;
    lastPlayTime = now;

    var v = getVolume();
    if (v <= 0) return;

    var a = base.cloneNode();
    a.volume = v;
    a.play().catch(function(){});
  }

  window.mcPlayClick = play;

  function handlePointer(e) {
    if (!e.target || !e.target.closest) return;

    if (e.target.matches && e.target.matches(INPUT_SELECTOR)) {
      play();
      return;
    }

    if (e.target.closest(SFX_SELECTOR)) {
      play();
    }
  }

  if (window.PointerEvent) {
    document.addEventListener('pointerdown', handlePointer, true);
  } else {
    document.addEventListener('mousedown',  handlePointer, true);
    document.addEventListener('touchstart', handlePointer, true);
  }

  document.addEventListener('lockchange',  function() { play(); }, true);
  document.addEventListener('checkchange', function() { play(); }, true);

  base.load();
})();