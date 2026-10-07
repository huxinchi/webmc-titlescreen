(function() {
  'use strict';

  /* ==========================================================
     CycleButton
     源码：CycleButton extends AbstractButton
     - 左键 → 下一个
     - Shift+左键 → 上一个
     - 滚轮上 → 上一个，滚轮下 → 下一个
     用法：
       var btn = new CycleButton(el, {
         values: ['OFF', 'ON', 'SYSTEM'],
         value: 'OFF',
         name: 'Narrator',
         displayState: 'NAME_AND_VALUE',   // 或 'VALUE' / 'HIDE'
         valueStringifier: function(v) { return I18n.t('narrator.' + v); },
         onChange: function(v) { ... }
       });
     ========================================================== */
  function CycleButton(el, options) {
    if (!el) throw new Error('CycleButton: element required');
    options = options || {};

    this.el               = el;
    this.values           = options.values || [];
    this.value            = options.value != null ? options.value : this.values[0];
    this.name             = options.name || '';
    this.displayState     = options.displayState || 'NAME_AND_VALUE';
    this.valueStringifier = options.valueStringifier || function(v) { return String(v); };
    this.onChange         = options.onChange || function() {};

    if (this.values.length === 0) throw new Error('CycleButton: no values');

    el.classList.add('mc-cycle-btn');
    if (el.tagName === 'BUTTON') el.type = 'button';
    if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON') el.tabIndex = 0;

    var self = this;

    /* 点击 */
    el.addEventListener('click', function(e) {
      var delta = e.shiftKey ? -1 : 1;
      self.cycle(delta);
    });

    /* 滚轮 */
    el.addEventListener('wheel', function(e) {
      e.preventDefault();
      self.cycle(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    this._updateLabel();
  }

  CycleButton.prototype.cycle = function(delta) {
    var len = this.values.length;
    var idx = this.values.indexOf(this.value);
    if (idx < 0) idx = 0;
    idx = ((idx + delta) % len + len) % len;
    this.value = this.values[idx];
    this._updateLabel();
    this.onChange(this.value, this);
  };

  CycleButton.prototype.getValue = function() {
    return this.value;
  };

  CycleButton.prototype.setValue = function(v) {
    if (this.values.indexOf(v) < 0) return;
    this.value = v;
    this._updateLabel();
    this.onChange(v, this);
  };

  CycleButton.prototype._updateLabel = function() {
    var valueText = this.valueStringifier(this.value);
    var label;
    if (this.displayState === 'VALUE') {
      label = valueText;
    } else if (this.displayState === 'HIDE') {
      label = this.name;
    } else {
      label = this.name ? (this.name + ': ' + valueText) : valueText;
    }
    this.el.textContent = label;
  };

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.CycleButton = CycleButton;
})();