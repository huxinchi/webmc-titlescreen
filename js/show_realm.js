(function() {
  'use strict';

  /* ============ Cookie 工具 ============ */
  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m[2]) : '';
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days || 365) * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/';
  }
  function delCookie(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  }
  /* ============ 元素引用 ============ */
  var newsEl   = document.getElementById('realms-news');
  var inviteEl = document.getElementById('realms-invite');
  var trialEl  = document.getElementById('realms-trial');
  /* ============ 按 cookie 决定显隐 ============ */
  var showNews    = getCookie('realms_news') === '1';
  var inviteState = getCookie('realms_invite');    /* '' | '0' | '1' */
  var showTrial   = getCookie('realms_trial') === '1';

  newsEl.style.display   = showNews ? 'block' : 'none';
  inviteEl.style.display = (inviteState !== '') ? 'block' : 'none';
  trialEl.style.display  = showTrial ? 'block' : 'none';

  if (inviteState !== '') {
    inviteEl.src = inviteState === '1'
      ? 'assets/icon/realms_invite_on.png'
      : 'assets/icon/realms_invite_off.png';
  }

  /* ============ 动态布局：从右往左累加 ============ */
  var RIGHT_START = 2;   /* 最右图标距按钮右边缘的偏移 */
  var GAP = 1;           /* 相邻图标间隔 */

  /* 按视觉从右到左的顺序排列（和 DOM 顺序一致） */
  var ORDER = [
    { el: newsEl,   width: 16, top: 2  },
    { el: inviteEl, width: 15, top: -4 },
    { el: trialEl,  width: 8,  top: 6  },
  ];

  function layoutRealmsIcons() {
    var right = RIGHT_START;
    for (var i = 0; i < ORDER.length; i++) {
      var item = ORDER[i];
      if (item.el.style.display !== 'none') {
        item.el.style.right = right + 'px';
        item.el.style.top   = item.top + 'px';
        right += item.width + GAP;
      }
    }
  }

  layoutRealmsIcons();

  /* ============ trial 闪烁 ============ */
  if (showTrial) {
    var frameA = 'assets/icon/realms_trial_on.png';
    var frameB = 'assets/icon/realms_trial_off.png';
    var flip = false;
    setInterval(function() {
      flip = !flip;
      trialEl.src = flip ? frameB : frameA;
    }, 800);
  }
})();