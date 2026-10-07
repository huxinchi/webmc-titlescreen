/* ==========================================================
   Console —— 页面内 JS 执行器 + console.log 重定向（资源包版）

   效果：
     1. 右下角出现一个 "JS" 按钮
     2. 重定向 console.log / info / warn / error / debug，
        所有输出被记录下来
     3. 点击按钮 → 先显示累积的日志 → 再 prompt 输入一段 JS
        - 输入 :clear 清空日志
        - 输入其他内容 → 在当前页面执行 → alert 返回值
        - 取消 / 空输入 → 什么都不做

   导入方式：把本文件拖进资源包界面，或点 "Open Pack Folder" 选中。
   ========================================================== */

(window.__mcResourcePacks = window.__mcResourcePacks || {})['console'] = {
  id:            'console',
  title:         'Console',
  description:   'Run JavaScript and capture console output',
  source:        'user',
  compatibility: 'compatible',

  /* ---------- 内部状态 ---------- */
  _btn:         null,
  _style:       null,
  _logs:        [],
  _origConsole: null,
  _hooked:      false,
  _maxLogs:     500,

  /* ==========================================================
     apply
     ========================================================== */
  apply: function() {
    var self = window.__mcResourcePacks['console'];
    if (!self) return;

    /* ---------- 样式 ---------- */
    if (!document.getElementById('mc-console-style')) {
      var style = document.createElement('style');
      style.id = 'mc-console-style';
      style.textContent = [
        '#mc-console-btn {',
        '  position: fixed;',
        '  right: 8px;',
        '  bottom: 40px;',
        '  z-index: 99999;',
        '  min-width: 28px;',
        '  height: 20px;',
        '  padding: 0 4px;',
        '  border: none;',
        '  box-sizing: border-box;',
        '  cursor: pointer;',
        '  background: rgba(0, 0, 0, 0.55);',
        '  color: #ffffff;',
        '  font-family: "Minecraft", monospace;',
        '  font-size: 10px;',
        '  line-height: 20px;',
        '  text-align: center;',
        '  outline: 1px solid #ffffff;',
        '  outline-offset: -1px;',
        '  user-select: none;',
        '  -webkit-tap-highlight-color: transparent;',
        '  image-rendering: pixelated;',
        '}',
        '#mc-console-btn:hover  { background: rgba(255, 255, 255, 0.20); }',
        '#mc-console-btn:active { background: rgba(255, 255, 255, 0.35); }'
      ].join('\n');
      document.head.appendChild(style);
      self._style = style;
    }

    /* ---------- 按钮 ---------- */
    if (!document.getElementById('mc-console-btn')) {
      var btn = document.createElement('button');
      btn.id = 'mc-console-btn';
      btn.type = 'button';
      btn.textContent = 'JS';
      btn.title = 'Run JavaScript';

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        self._askAndRun();
      });

      if (document.body) {
        document.body.appendChild(btn);
        self._btn = btn;
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          if (!document.getElementById('mc-console-btn')) {
            document.body.appendChild(btn);
            self._btn = btn;
          }
        }, { once: true });
      }
    }

    /* ---------- hook console ---------- */
    self._hookConsole();
  },

  /* ==========================================================
     unapply
     ========================================================== */
  unapply: function() {
    var self = window.__mcResourcePacks['console'];
    if (!self) return;

    var b  = document.getElementById('mc-console-btn');
    if (b) b.remove();
    var st = document.getElementById('mc-console-style');
    if (st) st.remove();

    self._btn   = null;
    self._style = null;

    self._unhookConsole();
  },

  /* ==========================================================
     console hook
     ========================================================== */
  _hookConsole: function() {
    if (this._hooked) return;

    var self = this;
    var orig = {
      log:   console.log,
      info:  console.info,
      warn:  console.warn,
      error: console.error,
      debug: console.debug
    };
    this._origConsole = orig;

    function makeHook(type, original) {
      return function() {
        var args;
        try {
          args = Array.prototype.slice.call(arguments);
        } catch (e) { args = []; }
        try { self._pushLog(type, args); } catch (e) {}

        /* 保留原生行为（开发者工具里还能看到） */
        try { original.apply(console, args); } catch (e) {}
      };
    }

    console.log   = makeHook('log',   orig.log);
    console.info  = makeHook('info',  orig.info);
    console.warn  = makeHook('warn',  orig.warn);
    console.error = makeHook('error', orig.error);
    console.debug = makeHook('debug', orig.debug);

    this._hooked = true;
  },

  _unhookConsole: function() {
    if (!this._hooked || !this._origConsole) return;
    console.log   = this._origConsole.log;
    console.info  = this._origConsole.info;
    console.warn  = this._origConsole.warn;
    console.error = this._origConsole.error;
    console.debug = this._origConsole.debug;
    this._origConsole = null;
    this._hooked = false;
  },

  /* ==========================================================
     记录一条日志
     ========================================================== */
  _pushLog: function(type, args) {
    var text = args.map(function(a) {
      try {
        if (typeof a === 'string')    return a;
        if (a === null)               return 'null';
        if (a === undefined)          return 'undefined';
        if (typeof a === 'function')  return a.toString();
        if (typeof a === 'object') {
          try { return JSON.stringify(a); }
          catch (e) { return String(a); }
        }
        return String(a);
      } catch (e) { return '[unprintable]'; }
    }).join(' ');

    this._logs.push({ type: type, text: text, time: Date.now() });

    /* 超过上限 → 去掉最旧的 */
    if (this._logs.length > this._maxLogs) {
      this._logs.splice(0, this._logs.length - this._maxLogs);
    }
  },

  /* ==========================================================
     日志 → 可显示字符串
     ========================================================== */
  _formatLogs: function() {
    if (this._logs.length === 0) return '';
    return this._logs.map(function(l) {
      return '[' + l.type + '] ' + l.text;
    }).join('\n');
  },

  /* ==========================================================
     主入口
     ========================================================== */
  _askAndRun: function() {
    /* 1. 先显示累积的日志（如果有） */
    var logs = this._formatLogs();
    if (logs) {
      var MAX_LEN = 4000;
      if (logs.length > MAX_LEN) {
        logs = '...(' + this._logs.length + ' logs, tail shown)\n'
             + logs.slice(-MAX_LEN);
      }
      window.alert(logs);
    }

    /* 2. prompt 输入 */
    var code = window.prompt('JS>  (:clear to clear logs)');
    if (code === null) return;

    code = code.trim();
    if (code === '') return;

    /* 3. :clear 命令 */
    if (code === ':clear' || code === ':c') {
      this._logs = [];
      window.alert('Logs cleared');
      return;
    }

    /* 4. 执行 */
    var r = this._eval(code);

    if (!r.ok) {
      var msg;
      try {
        msg = (r.error && r.error.message) ? r.error.message : String(r.error);
      } catch (e) { msg = 'Unknown error'; }
      window.alert('Error:\n' + msg);
      return;
    }

    var display;
    try {
      display = this._stringify(r.value);
    } catch (e) {
      display = '[unprintable]';
    }
    window.alert(display);
  },

  /* ==========================================================
     执行：先表达式，再语句
     ========================================================== */
  _eval: function(code) {
    if (typeof code !== 'string' || code.trim() === '') {
      return { ok: false, value: undefined, error: new Error('Empty code') };
    }
    try {
      var fn = new Function('return (' + code + '\n);');
      return { ok: true, value: fn() };
    } catch (e1) {
      try {
        var fn2 = new Function(code);
        return { ok: true, value: fn2() };
      } catch (e2) {
        return { ok: false, value: undefined, error: e2 };
      }
    }
  },

  /* ==========================================================
     返回值 → 可显示字符串
     ========================================================== */
  _stringify: function(v) {
    if (v === undefined) return 'undefined';
    if (v === null)      return 'null';

    var type = typeof v;
    if (type === 'string')   return v;
    if (type === 'number')   return String(v);
    if (type === 'boolean')  return String(v);
    if (type === 'function') return v.toString();

    try {
      return JSON.stringify(v, null, 2);
    } catch (e) {
      try { return String(v); }
      catch (e2) { return '[object]'; }
    }
  }
};