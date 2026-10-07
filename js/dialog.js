(function() {
  'use strict';

  if (window.mcDialog) return;

  var ROOT_ID = 'mc-dialog-root';

  /* 当前打开的对话框（一次只允许一个） */
  var current = null;

  /* ==========================================================
     i18n fallback
     ========================================================== */
  function t(key, fallback) {
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    if (v === key && fallback != null) return fallback;
    return v;
  }

  /* ==========================================================
     等 i18n 就绪再执行 fn
     - i18n 已就绪 → 立即执行
     - i18n 未就绪 → 加入 pending 队列，就绪后执行
     - i18n 未加载（页面没引 i18n.js）→ 直接执行，用 fallback
     ========================================================== */
  function withI18n(fn) {
    if (window.i18n && typeof window.i18n.ready === 'function') {
      window.i18n.ready(fn);
    } else {
      fn();
    }
  }

  /* ==========================================================
     DOM 管理
     ========================================================== */
  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'mc-dialog-hidden';
      if (document.body) {
        document.body.appendChild(root);
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          if (!document.getElementById(ROOT_ID)) {
            document.body.appendChild(root);
          }
        }, { once: true });
      }
    }
    return root;
  }

  function close() {
    var root = document.getElementById(ROOT_ID);
    if (root) {
      root.classList.add('mc-dialog-hidden');
      root.innerHTML = '';
    }
    current = null;
  }

  /* ==========================================================
     打开对话框（底层，不用 withI18n；调用方保证文案已算好）
     opts = {
       title, message, buttons: [{ text, onClick }], variant, onClose
     }
     ========================================================== */
  function open(opts) {
    var root = ensureRoot();
    root.innerHTML = '';
    root.classList.remove('mc-dialog-hidden');

    var box = document.createElement('div');
    box.className = 'mc-dialog-box';
    if (opts.variant === 'data') {
      box.classList.add('mc-dialog-variant-data');
    }

    if (opts.title) {
      var titleEl = document.createElement('div');
      titleEl.className = 'mc-dialog-title';
      titleEl.textContent = opts.title;
      box.appendChild(titleEl);
    }

    if (opts.message != null && opts.message !== '') {
      var msgEl = document.createElement('div');
      msgEl.className = 'mc-dialog-message';
      msgEl.textContent = opts.message;
      box.appendChild(msgEl);
    }

    var btnRow = document.createElement('div');
    btnRow.className = 'mc-dialog-buttons';

    (opts.buttons || []).forEach(function(b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mcbtn mcbtn-150';
      btn.textContent = b.text != null ? b.text : 'OK';

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        close();
        try {
          if (typeof b.onClick === 'function') b.onClick();
          if (typeof opts.onClose === 'function') opts.onClose();
        } catch (err) {
          console.error('[mcDialog]', err);
        }
      });

      btnRow.appendChild(btn);
    });

    if (btnRow.children.length > 0) {
      box.appendChild(btnRow);
    }

    root.appendChild(box);

    var first = btnRow.querySelector('button');
    if (first) {
      try { first.focus(); } catch (e) {}
    }

    current = { opts: opts, root: root };
    return current;
  }

  /* ==========================================================
     对外 API —— 单按钮提示
     ========================================================== */
  function alert(opts) {
    opts = opts || {};
    withI18n(function() {
      var btnText = opts.buttonText || t('gui.ok', 'OK');
      open({
        title:    opts.title,
        message:  opts.message,
        variant:  opts.variant,
        buttons: [
          {
            text: btnText,
            onClick: function() {
              if (typeof opts.onConfirm === 'function') opts.onConfirm();
            }
          }
        ],
        onClose: opts.onClose
      });
    });
  }

  /* ==========================================================
     对外 API —— 双按钮确认
     ========================================================== */
  function confirm(opts) {
    opts = opts || {};
    withI18n(function() {
      var yesText = opts.yesText || t('gui.yes', 'Yes');
      var noText  = opts.noText  || t('gui.no',  'No');
      open({
        title:   opts.title,
        message: opts.message,
        variant: opts.variant,
        buttons: [
          {
            text: yesText,
            onClick: function() {
              if (typeof opts.onYes === 'function') opts.onYes();
            }
          },
          {
            text: noText,
            onClick: function() {
              if (typeof opts.onNo === 'function') opts.onNo();
            }
          }
        ],
        onClose: opts.onClose
      });
    });
  }

  /* ==========================================================
     键盘拦截：对话框打开时，屏蔽 Esc / Enter 冒泡
     ========================================================== */
  document.addEventListener('keydown', function(e) {
    if (!current) return;
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* ==========================================================
     对外
     ========================================================== */
  window.mcDialog = {
    alert:   alert,
    confirm: confirm,
    open:    open,
    close:   close,
    isOpen:  function() { return !!current; }
  };

})();