(function() {
  'use strict';

  /* ==========================================================
     OptionsList —— 通用选项列表组件
     对应源码 OptionsList.addSmall / addBig 布局
     页面只需传 options 定义 + rows 布局，其余交给本组件

     用法：
       new mcWidgets.OptionsList(container, {
         options: { 'options.xxx': { type: 'boolean', value: false }, ... },
         rows:    [ ['options.aaa', 'options.bbb'], ['options.ccc'], ... ],
         // 可选覆盖：
         t:         function(key) {...},
         valueText: function(opt, v) {...},
         fullLabel: function(opt, v) {...}
       });

     rows 支持四种形态：
       ['k1', 'k2']         → 一行两个 150 宽控件
       ['k1']               → 一行一个 310 宽控件（对齐 addBig）
       { big:    'k1' }     → 显式整行 310 宽（同 ['k1']）
       { header: 'k.key' }  → 分区标题（加粗下划线）
     ========================================================== */

  function defaultT(key) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
  }

  /* ==========================================================
     值文本
     ========================================================== */
  function defaultValueText(opt, v, t) {
    var onText  = t('options.on');
    var offText = t('options.off');

    switch (opt.type) {
      case 'boolean':
        return v ? onText : offText;

      case 'enum':
        /* valueMap 优先：直指完整 i18n key，避免猜拼接规则 */
        if (opt.valueMap && opt.valueMap[v] != null) {
          return t(opt.valueMap[v]);
        }
        return t(opt.valueKey + v);

      case 'chatBg':
        return v ? t('options.accessibility.text_background.chat')
                 : t('options.accessibility.text_background.everywhere');

      case 'slider':
        switch (opt.format) {
          case 'percent':      return Math.round(v * 100) + '%';
          case 'percentOrOff': return v <= 0 ? offText : Math.round(v * 100) + '%';
          case 'intOrOff':     return v <= 0 ? offText : String(v);
          case 'chatOpacity':  return Math.round((v * 0.9 + 0.1) * 100) + '%';
          case 'multiplier':   return v.toFixed(1) + 'x';
          case 'chatDelay':    return '';   /* fullLabel 里单独处理 */

          case 'framerate':
            return v >= 260 ? t('options.framerateLimit.max')
                            : t('options.framerate').replace('%s', v);

          case 'guiScale':
            return v === 0 ? t('options.guiScale.auto') : String(v);

          case 'gamma': {
            var p = Math.round(v * 100);
            if (p === 0)   return t('options.gamma.min');
            if (p === 50)  return t('options.gamma.default');
            if (p === 100) return t('options.gamma.max');
            return String(p);
          }

          case 'biomeBlend':
            return t('options.biomeBlendRadius.' + (v * 2 + 1));

          case 'chunks':
            return t('options.chunks').replace('%s', v);

          case 'blocks':
            return t('options.blocks').replace('%s', v);

          case 'anisotropy':
            return v === 0 ? offText
                           : t('options.multiplier').replace('%s', 1 << v);

          case 'chunkFade':
            return v <= 0 ? t('options.chunkFade.none')
                          : t('options.chunkFade.seconds').replace('%s', v.toFixed(2));

          default: return String(v);
        }
    }
    return String(v);
  }

  /* ==========================================================
     完整标签（标题: 值）
     ========================================================== */
  function defaultFullLabel(opt, v, t, valueText) {
    /* chatDelay 例外：key 本身就是完整句子 */
    if (opt.format === 'chatDelay') {
      if (v <= 0) return t('options.chat.delay_none');
      var s = t('options.chat.delay');
      return s.indexOf('%s') >= 0 ? s.replace('%s', v.toFixed(1)) : s;
    }

    /* 其他：源码 generic_value = "%s: %s" */
    var generic = t('options.generic_value');
    if (generic === 'options.generic_value') generic = '%s: %s';
    return generic.replace('%s', t(opt.key)).replace('%s', valueText(opt, v));
  }

  /* ==========================================================
     构造
     ========================================================== */
  function OptionsList(container, opts) {
    if (!container) throw new Error('OptionsList: container required');
    opts = opts || {};

    this.el      = container;
    this.options = opts.options || {};
    this.rows    = opts.rows    || [];
    this.t       = opts.t || defaultT;

    var self = this;

    this.valueText = opts.valueText || function(opt, v) {
      return defaultValueText(opt, v, self.t);
    };
    this.fullLabel = opts.fullLabel || function(opt, v) {
      return defaultFullLabel(opt, v, self.t, self.valueText);
    };

    /* i18n 就绪后自动重渲染 */
    document.addEventListener('i18n-ready', function() { self.render(); }, false);

    if (window.i18n && window.i18n.ready) {
      window.i18n.ready(function() { self.render(); });
    } else {
      self.render();
    }
  }

  /* ==========================================================
     渲染
     ========================================================== */
  OptionsList.prototype.render = function() {
    this.el.innerHTML = '';

    for (var r = 0; r < this.rows.length; r++) {
      var rowDef = this.rows[r];

      /* ---- 非数组：header 或 big ---- */
      if (rowDef && !Array.isArray(rowDef)) {
        if (rowDef.header) {
          var h = document.createElement('div');
          h.className = 'mc-options-header';
          h.textContent = this.t(rowDef.header);
          this.el.appendChild(h);
        } else if (rowDef.big) {
          var bk = rowDef.big;
          var bo = this.options[bk];
          if (!bo) continue;
          bo.key = bk;

          var bigRow = document.createElement('div');
          bigRow.className = 'mc-options-row mc-options-row-big';
          var bc = this._makeControl(bk, bo, 310);
          if (bc) bigRow.appendChild(bc);
          this.el.appendChild(bigRow);
        }
        continue;
      }

      /* ---- 数组：普通行 ---- */
      var row = document.createElement('div');
      row.className = 'mc-options-row';

      var rowWidth = (rowDef.length === 1) ? 310 : 150;

      for (var c = 0; c < rowDef.length; c++) {
        var k = rowDef[c];
        var o = this.options[k];
        if (!o) continue;
        o.key = k;

        var ctrl = this._makeControl(k, o, rowWidth);
        if (ctrl) row.appendChild(ctrl);
      }

      this.el.appendChild(row);
    }

    if (window.mcWidgets && window.mcWidgets.initAllSliders) {
      window.mcWidgets.initAllSliders();
    }
  };

  /* ==========================================================
     单个控件
     ========================================================== */
  OptionsList.prototype._makeControl = function(key, opt, width) {
    width = width || 150;
    var self = this;

    /* 宽度只决定类名，其它地方不碰 width */
    var btnCls = (width >= 310) ? 'mcbtn mcbtn-310' : 'mcbtn mcbtn-150';
    var sldCls = (width >= 310) ? 'mc-slider mc-slider-310' : 'mc-slider';

    /* --- button --- */
    if (opt.type === 'button') {
      var a = document.createElement('a');
      a.className = btnCls;
      a.href = opt.href || '#';
      a.textContent = self.t(opt.key);
      return a;
    }

    /* --- boolean / enum / chatBg --- */
    if (opt.type === 'boolean' || opt.type === 'enum' || opt.type === 'chatBg') {
      var btn = document.createElement('button');
      btn.className = btnCls + ' mc-cycle-btn';
      btn.type = 'button';
      if (opt.disabled) btn.disabled = true;

      var values;
      if (opt.type === 'boolean' || opt.type === 'chatBg') values = [true, false];
      else                                                 values = opt.values;

      var cv = window.mcOptions.get(key, opt.value);

      if (window.mcWidgets && window.mcWidgets.CycleButton) {
        new window.mcWidgets.CycleButton(btn, {
          values: values,
          value: cv,
          name: '',
          displayState: 'VALUE',
          valueStringifier: function(v) { return self.fullLabel(opt, v); },
          onChange: function(v) {
            window.mcOptions.set(key, v);
            btn.textContent = self.fullLabel(opt, v);
            btn.dispatchEvent(new CustomEvent('optionchange', {
              bubbles: true,
              detail: { id: key, value: v }
            }));
          }
        });
        btn.textContent = self.fullLabel(opt, cv);
      } else {
        btn.textContent = self.fullLabel(opt, cv);
      }
      return btn;
    }

    /* --- slider --- */
    if (opt.type === 'slider') {
      var slider = document.createElement('div');
      slider.className = sldCls;
      slider.dataset.min  = opt.min;
      slider.dataset.max  = opt.max;
      slider.dataset.step = opt.step;

      var sv = window.mcOptions.get(key, opt.value);
      slider.dataset.value = sv;

      slider.innerHTML =
        '<div class="mc-slider-track"></div>' +
        '<div class="mc-slider-handle"></div>' +
        '<span class="mc-options-slider-label"></span>';

      var labelEl = slider.querySelector('.mc-options-slider-label');
      labelEl.textContent = self.fullLabel(opt, sv);

      slider.addEventListener('slide', function(e) {
        window.mcOptions.set(key, e.detail.value);
        labelEl.textContent = self.fullLabel(opt, e.detail.value);
        slider.dispatchEvent(new CustomEvent('optionchange', {
          bubbles: true,
          detail: { id: key, value: e.detail.value }
        }));
      });

      return slider;
    }

    return null;
  };

  /* ==========================================================
     对外
     ========================================================== */
  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.OptionsList = OptionsList;
})();