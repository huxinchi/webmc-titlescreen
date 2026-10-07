(function() {
  'use strict';

  /* ==========================================================
     Checkbox
     源码：Checkbox.onPress → selected = !selected → onValueChange
     - 点击整行或直接点 checkbox 都切换
     - 派发 'checkchange' 事件，detail.checked = boolean
     ========================================================== */
  document.addEventListener('click', function(e) {
    var box = e.target && e.target.closest
      ? e.target.closest('.mc-checkbox-row, .mc-checkbox')
      : null;
    if (!box) return;

    var cb = box.classList.contains('mc-checkbox')
      ? box
      : box.querySelector('.mc-checkbox');
    if (!cb || cb.disabled) return;

    var checked = cb.dataset.checked === 'true';
    cb.dataset.checked = checked ? 'false' : 'true';

    /* 源码：点击后 setFocused(true)，所以会显示 highlighted */
    try { cb.focus(); } catch (e) {}

    cb.dispatchEvent(new CustomEvent('checkchange', {
      bubbles: true,
      detail: { checked: !checked }
    }));
  }, true);

  /* ==========================================================
     工具
     ========================================================== */
  window.mcWidgets = window.mcWidgets || {};

  window.mcWidgets.isChecked = function(el) {
    return !!(el && el.dataset.checked === 'true');
  };

  window.mcWidgets.setChecked = function(el, checked) {
    if (el) el.dataset.checked = checked ? 'true' : 'false';
  };
})();