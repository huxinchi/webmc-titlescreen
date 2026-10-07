(function() {
  'use strict';

  var allInstances = [];

  function CycleButton(el, options) {
    if (!el) throw new Error('CycleButton: element required');
    options = options || {};

    this.el               = el;
    this.values           = options.values || [];
    this.value            = options.value != null ? options.value : this.values[0];
    this.name             = options.name || '';
    this.labelKey         = options.labelKey || null;
    this.valueKeyFn       = options.valueKeyFn || null;
    this.displayState     = options.displayState || 'NAME_AND_VALUE';
    this.valueStringifier = options.valueStringifier || function(v) { return String(v); };
    this.valueDisplayFn   = options.valueDisplayFn || null;
    this.onChange         = options.onChange || function() {};
    this.tResolver        = options.tResolver || null;   /* ★ 外部翻译函数（带 fallback） */

    if (this.values.length === 0) throw new Error('CycleButton: no values');

    el.classList.add('mc-cycle-btn');
    if (el.tagName === 'BUTTON') el.type = 'button';
    if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON') el.tabIndex = 0;

    var self = this;

    el.addEventListener('click', function(e) {
      e.preventDefault();
      self.cycle(e.shiftKey ? -1 : 1);
    });

    el.addEventListener('wheel', function(e) {
      e.preventDefault();
      self.cycle(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    this._updateLabel();
    allInstances.push(this);
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

  CycleButton.prototype.getValue = function() { return this.value; };

  CycleButton.prototype.setValue = function(v) {
    if (this.values.indexOf(v) < 0) return;
    this.value = v;
    this._updateLabel();
    this.onChange(v, this);
  };

  CycleButton.prototype.setValues = function(values) {
    if (!Array.isArray(values) || values.length === 0) return false;
    this.values = values.slice();
    var changed = false;
    if (this.values.indexOf(this.value) < 0) {
      this.value = this.values[0];
      this._updateLabel();
      changed = true;
    }
    return changed;
  };

  /* ★ 统一翻译入口：优先 tResolver，其次 i18n.t */
  CycleButton.prototype._t = function(key) {
    if (!key) return '';
    if (this.tResolver) {
      try { return this.tResolver(key); } catch (e) {}
    }
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    return v;
  };

  CycleButton.prototype._valueText = function() {
    if (this.valueDisplayFn) {
      try { return this.valueDisplayFn(this.value); }
      catch (e) { return String(this.value); }
    }
    return this.valueStringifier(this.value);
  };

  CycleButton.prototype._updateLabel = function() {
    var el = this.el;
    el.innerHTML = '';
    var self = this;

    function appendI18nSpan(key) {
      var span = document.createElement('span');
      span.setAttribute('data-i18n', key);
      span.textContent = self._t(key);
      el.appendChild(span);
    }

    function appendText(text) {
      el.appendChild(document.createTextNode(text));
    }

    var labelSource = this.labelKey || this.name;
    var valueKey    = this.valueKeyFn ? this.valueKeyFn(this.value) : null;

    if (this.displayState === 'VALUE') {
      if (valueKey) appendI18nSpan(valueKey);
      else appendText(this._valueText());
      return;
    }

    if (this.displayState === 'HIDE') {
      if (this.labelKey) appendI18nSpan(this.labelKey);
      else if (this.name) appendText(this.name);
      return;
    }

    /* NAME_AND_VALUE */
    if (this.labelKey) appendI18nSpan(this.labelKey);
    else if (this.name) appendText(this.name);

    if (labelSource) appendText(': ');

    if (valueKey) appendI18nSpan(valueKey);
    else appendText(this._valueText());
  };

  document.addEventListener('i18n-ready', function() {
    for (var i = 0; i < allInstances.length; i++) {
      try { allInstances[i]._updateLabel(); } catch (e) {}
    }
  }, false);

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.CycleButton = CycleButton;
})();