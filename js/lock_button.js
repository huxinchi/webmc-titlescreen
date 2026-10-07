(function() {
  'use strict';

  /* ==========================================================
     Lock Icon Button
     源码：LockIconButton.onPress → setLocked(!locked)
     - 派发 'lockchange' 事件，detail.locked = boolean
     ========================================================== */
  document.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest
      ? e.target.closest('.mc-lock-btn')
      : null;
    if (!btn || btn.disabled) return;

    var locked = btn.dataset.state === 'locked';
    btn.dataset.state = locked ? 'unlocked' : 'locked';

    try { btn.focus(); } catch (e) {}

    btn.dispatchEvent(new CustomEvent('lockchange', {
      bubbles: true,
      detail: { locked: !locked }
    }));
  }, true);

  /* ==========================================================
     工具
     ========================================================== */
  window.mcWidgets = window.mcWidgets || {};

  window.mcWidgets.isLocked = function(el) {
    return !!(el && el.dataset.state === 'locked');
  };

  window.mcWidgets.setLocked = function(el, locked) {
    if (el) el.dataset.state = locked ? 'locked' : 'unlocked';
  };
})();