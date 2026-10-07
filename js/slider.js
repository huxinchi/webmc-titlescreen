(function() {
  'use strict';

  function initSlider(el) {
    var handle = el.querySelector('.mc-slider-handle');
    if (!handle) return null;

    var min   = parseFloat(el.dataset.min   || '0');
    var max   = parseFloat(el.dataset.max   || '1');
    var step  = parseFloat(el.dataset.step  || '0');
    var value = parseFloat(el.dataset.value || String(min));

    var dragging = false;

    function clamp(v) { return Math.max(min, Math.min(max, v)); }

    function snap(v) {
      if (step > 0) {
        var steps = Math.round((v - min) / step);
        v = min + steps * step;
      }
      return clamp(v);
    }

    function updateHandlePosition() {
      var ratio = (value - min) / (max - min);
      var trackW = el.clientWidth - handle.offsetWidth;
      handle.style.left = (ratio * trackW) + 'px';
    }

    function valueFromX(clientX) {
      var rect = el.getBoundingClientRect();
      var relX = clientX - rect.left - handle.offsetWidth / 2;
      var trackW = el.clientWidth - handle.offsetWidth;
      var ratio = trackW > 0 ? Math.max(0, Math.min(1, relX / trackW)) : 0;
      return min + ratio * (max - min);
    }

    function setValue(v, fireEvent) {
      v = snap(v);
      if (v === value) return;
      value = v;
      el.dataset.value = value;
      updateHandlePosition();

      if (fireEvent) {
        el.dispatchEvent(new CustomEvent('slide', {
          bubbles: true,
          detail: { value: value }
        }));
      }
    }

    /* --- 鼠标 --- */
    el.addEventListener('mousedown', function(e) {
      dragging = true;
      el.classList.add('dragging');
      setValue(valueFromX(e.clientX), true);
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      setValue(valueFromX(e.clientX), true);
    });

    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');

if (window.mcPlayClick) window.mcPlayClick();
    });

    /* --- 触摸 --- */
    el.addEventListener('touchstart', function(e) {
      dragging = true;
      el.classList.add('dragging');
      setValue(valueFromX(e.touches[0].clientX), true);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
      if (!dragging) return;
      setValue(valueFromX(e.touches[0].clientX), true);
    }, { passive: false });

    document.addEventListener('touchend', function() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');

      /* 源码 onRelease 播一次音效 */
if (window.mcPlayClick) window.mcPlayClick();
    });

    window.addEventListener('resize', updateHandlePosition);

    /* 让 slider 可聚焦（:focus 高亮轨道） */
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;

    updateHandlePosition();

    return {
      el: el,
      getValue: function() { return value; },
      setValue: function(v) { setValue(v, false); }
    };
  }

  function initAllSliders() {
    var list = document.querySelectorAll('.mc-slider:not(.inited)');
    for (var i = 0; i < list.length; i++) {
      list[i].classList.add('inited');
      initSlider(list[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSliders);
  } else {
    initAllSliders();
  }

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.initSlider = initSlider;
  window.mcWidgets.initAllSliders = initAllSliders;
})();