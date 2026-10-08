(function() {
  'use strict';

  /* ==========================================================
     跳转链 —— 用 URL 参数 fromurl 传递栈
     ========================================================== */

  var PARAM = 'fromurl';

  function currentPage() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function safeFilename(s) {
    return /^[a-z0-9_\-]+\.html$/i.test(String(s));
  }

  /* ==========================================================
     读取当前 URL 上的 fromurl 栈
     ========================================================== */
  function readStack() {
    try {
      var params = new URLSearchParams(location.search);
      var raw = params.get(PARAM);
      if (!raw) return [];
      raw = raw.replace(/-/g, '+').replace(/_/g, '/');
      while (raw.length % 4) raw += '=';
      var arr = JSON.parse(atob(raw));
      if (!Array.isArray(arr)) return [];
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        if (safeFilename(arr[i])) out.push(arr[i]);
      }
      return out;
    } catch (e) {
      return [];
    }
  }

  /* ==========================================================
     栈 → fromurl 编码
     ========================================================== */
  function encodeStack(stack) {
    if (!stack || stack.length === 0) return '';
    var s = JSON.stringify(stack);
    var b = btoa(s);
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /* ==========================================================
     updateFromUrl
     - 保留 base 上所有查询参数（除 fromurl）
     - 若 stack 非空 → 追加/替换 fromurl
     - 若 stack 为空 → 剔除旧的 fromurl
     - 保留 hash
     ========================================================== */
  function updateFromUrl(base, stack) {
    if (!base) base = '';

    /* 1. 拆出 hash */
    var hashIdx = base.indexOf('#');
    var hash = '';
    if (hashIdx >= 0) {
      hash = base.substring(hashIdx);
      base = base.substring(0, hashIdx);
    }

    /* 2. 拆出 path 和 query */
    var qIdx = base.indexOf('?');
    var pathname = qIdx >= 0 ? base.substring(0, qIdx) : base;
    var queryStr = qIdx >= 0 ? base.substring(qIdx + 1) : '';

    /* 3. 遍历现有参数，剔除 fromurl，保留其余原样 */
    var kept = [];
    if (queryStr) {
      var pairs = queryStr.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        if (!pair) continue;

        var eq = pair.indexOf('=');
        var rawKey = eq >= 0 ? pair.substring(0, eq) : pair;
        var decodedKey;
        try { decodedKey = decodeURIComponent(rawKey.replace(/\+/g, ' ')); }
        catch (e) { decodedKey = rawKey; }

        if (decodedKey === PARAM) continue;   /* 丢弃旧 fromurl */
        kept.push(pair);
      }
    }

    /* 4. 追加新 fromurl（若栈非空） */
    var enc = encodeStack(stack);
    if (enc) kept.push(PARAM + '=' + enc);

    /* 5. 拼回 */
    var result = pathname;
    if (kept.length > 0) result += '?' + kept.join('&');
    return result + hash;
  }

  /* ==========================================================
     判断链接是否走"带栈跳转"
     - 排除 hash / http(s) / protocol-relative / mailto / tel / javascript
     - 只处理 .html 链接
     ========================================================== */
  function shouldAttachFrom(href) {
    if (!href) return false;
    if (href.charAt(0) === '#') return false;
    if (/^https?:\/\//i.test(href)) return false;
    if (/^\/\//.test(href)) return false;
    if (/^mailto:/i.test(href)) return false;
    if (/^tel:/i.test(href)) return false;
    if (/^javascript:/i.test(href)) return false;
    return /\.html([?#]|$)/i.test(href);
  }

  /* ==========================================================
     核心：back() —— 从栈里 pop 上一页并跳转
     ========================================================== */
  function back(fallbackUrl) {
    var stack = readStack();

    if (stack.length === 0) {
      if (fallbackUrl) {
        location.href = fallbackUrl;
        return true;
      }
      return false;
    }

    var target = stack.pop();
    location.href = updateFromUrl(target, stack);
    return true;
  }

  /* ==========================================================
     .btn-back 按钮
     栈非空 → 拦截点击，走 back()
     栈为空 → 保留 href，走默认跳转
     ========================================================== */
  function setupBackButtons() {
    var stack = readStack();
    if (stack.length === 0) return;

    var list = document.querySelectorAll('.btn-back');
    for (var i = 0; i < list.length; i++) {
      setupOneBack(list[i]);
    }
  }

  function setupOneBack(a) {
    var fallback = a.getAttribute('href') || '';
    a.removeAttribute('href');
    if (!a.hasAttribute('tabindex')) a.setAttribute('tabindex', '0');
    a.style.cursor = 'pointer';

    a.addEventListener('click', function(e) {
      e.preventDefault();
      back(fallback);
    });

    a.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        a.click();
      }
    });
  }

  /* ==========================================================
     普通内部链接
     .btn-back → 跳过（由 setupBackButtons 处理）
     .noback   → 完全跳过（外链/下载等，走默认行为，丢栈）
     .btn-jmp  → **不 push 当前页**，但**保留现有 fromurl 栈**再跳
                 （用于中间页：warning / disconnected 等）
     其它      → push 当前页 + 跳

     ★ 保留目标链接自身的查询参数，仅替换 fromurl
     ========================================================== */
  function setupLinks() {
    document.addEventListener('click', function(e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.classList.contains('btn-back')) return;
      if (a.classList.contains('noback'))   return;

      var href = a.getAttribute('href');
      if (!shouldAttachFrom(href)) return;

      /* ★ 保留原 href（含 query/hash），交给 updateFromUrl 处理 */
      var base = href;
      var s = readStack();

      if (!a.classList.contains('btn-jmp')) {
        s.push(currentPage());          /* 普通链接：压栈当前页 */
      }
      /* .btn-jmp：不 push，仅保留现有栈传递 */

      e.preventDefault();
      location.href = updateFromUrl(base, s);
    }, true);
  }

  /* ==========================================================
     对外接口
     ========================================================== */
  window.mcBack = {
    back: back,
    getStack: readStack,

    push: function(page) {
      var s = readStack();
      s.push(page || currentPage());
      location.href = updateFromUrl(currentPage(), s);
    },

    /* ========================================================
       前进：把当前页压栈 + 跳到 target（带 fromurl 传递）
       用于 <button> 手动监听场景
       ======================================================== */
  jump: function(target) {
    if (!target) return;
    /* ★ 保留 target 上的查询参数 */
    var base = target;
    var s = readStack();
    s.push(currentPage());
    location.href = updateFromUrl(base, s);
  },

  /* ========================================================
     前进：**不**把当前页压栈，仅保留现有 fromurl 栈
     用于中间页（connecting 等）—— 避免返回时跳回中间页
     等价于 <a class="btn-jmp"> 的语义
     ======================================================== */
  jumpNoPush: function(target) {
    if (!target) return;
    var s = readStack();
    location.href = updateFromUrl(target, s);
  },
  /* ========================================================
   backTo：退到栈里某个已存在的页面
   - 从栈顶往下找第一个匹配项
   - 以那一项为跳转目标，弹掉它之后的全部
   - 未找到 → 返回 false（调用方自行 fallback）
   匹配：完全相等 或 以 "page?" 开头（带查询参数的变体）
   ======================================================== */
backTo: function(page) {
  if (!page) return false;
  var stack = readStack();
  var idx = -1;
  for (var i = stack.length - 1; i >= 0; i--) {
    if (stack[i] === page || stack[i].indexOf(page + '?') === 0) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return false;

  var target   = stack[idx];
  var newStack = stack.slice(0, idx);
  location.href = updateFromUrl(target, newStack);
  return true;
}
};
 

  /* ==========================================================
     启动
     ========================================================== */
  function init() {
    setupBackButtons();
    setupLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();