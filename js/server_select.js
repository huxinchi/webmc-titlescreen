(function() {
  'use strict';

  var SPRITE_DIR   = 'assets/server_list/';
  var DEFAULT_ICON = 'assets/icon/world_selection/unknown_server.png';

  var PING_FRAME_MS = 100;

  /* LAN header 动画 —— 对齐 LoadingDotsText.java */
  var LAN_FRAMES   = ['O o o', 'o O o', 'o o O', 'o O o'];
  var LAN_FRAME_MS = 300;
  var lanLastFrame = -1;

  setInterval(function() {
    var idx = Math.floor(Date.now() / LAN_FRAME_MS) % LAN_FRAMES.length;
    if (idx === lanLastFrame) return;
    lanLastFrame = idx;
    var ch = LAN_FRAMES[idx];
    var els = document.querySelectorAll('.server-lan-dots');
    for (var i = 0; i < els.length; i++) els[i].textContent = ch;
  }, 100);

  /* LAN header 占位对象：可被选中 */
  var LAN_HEADER_SENTINEL = { type: 'lan', _isLanHeader: true };

  /* 触摸去重 —— 用布尔标志，不用时间戳 */
  var pendingTouchClick = false;

  var COLOR_CODES = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
  };

  function mcTextToHtml(text) {
    if (!text) return '';
    var out = '';
    var i = 0;
    var openSpan = false;
    while (i < text.length) {
      var c = text[i];
      if (c === '§' && i + 1 < text.length) {
        var code = text[i + 1].toLowerCase();
        if (COLOR_CODES[code]) {
          if (openSpan) { out += '</span>'; openSpan = false; }
          out += '<span style="color:' + COLOR_CODES[code] + '">';
          openSpan = true;
        }
        i += 2;
        continue;
      }
      if (c === '<')      out += '&lt;';
      else if (c === '>') out += '&gt;';
      else if (c === '&') out += '&amp;';
      else                out += c;
      i++;
    }
    if (openSpan) out += '</span>';
    return out;
  }

  function t(key) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
  }

  function tOr(key, fallback) {
    var v = (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    return v === key ? fallback : v;
  }

  function ServerSelectionList(container, options) {
    if (!container) throw new Error('ServerSelectionList: container required');
    options = options || {};

    this.el         = container;
    this.servers    = [];
    this.lanServers = [];
    this.selected   = null;

    this.onSelect    = options.onSelect    || null;
    this.onJoin      = options.onJoin      || null;
    this.onMoveUp    = options.onMoveUp    || null;
    this.onMoveDown  = options.onMoveDown  || null;
    this.defaultIcon = options.defaultIcon || DEFAULT_ICON;

    this._touchClear      = null;
    this._lastPointerType = 'mouse';
    this._lanHeaderEl     = null;

    var self = this;
    document.addEventListener('pointerdown', function(e) {
      self._lastPointerType = e.pointerType || 'mouse';
    }, true);

    this._startPingAnimation();
  }

  ServerSelectionList.prototype.setServers = function(servers) {
    this.servers = servers || [];
    this.selected = null;
    this.render();
  };

  ServerSelectionList.prototype.setLanServers = function(servers) {
    this.lanServers = (servers || []).map(function(s) {
      if (s) s._isLan = true;
      return s;
    });
    this.render();
  };

  ServerSelectionList.prototype.render = function() {
    var prevSelected = this.selected;

    this.el.innerHTML = '';
    this._lanHeaderEl = null;

    for (var k = 0; k < this.servers.length; k++) {
      this.el.appendChild(this._createEntry(this.servers[k], k));
    }

    var lanHeaderEl = this._createLanHeaderEntry();
    if (lanHeaderEl) this.el.appendChild(lanHeaderEl);

    for (var i = 0; i < this.lanServers.length; i++) {
      this.el.appendChild(this._createLanEntry(this.lanServers[i], i));
    }

    this._touchClear = null;

    this.selected = prevSelected;
    if (prevSelected === LAN_HEADER_SENTINEL) {
      if (this._lanHeaderEl) this._lanHeaderEl.classList.add('selected');
    } else if (prevSelected && prevSelected._entryEl) {
      prevSelected._entryEl.classList.add('selected');
    }
  };

  /* ==========================================================
     LAN header
     ========================================================== */
  ServerSelectionList.prototype._createLanHeaderEntry = function() {
    var self = this;

    var el = document.createElement('div');
    el.className = 'server-lan-header';

    var textEl = document.createElement('div');
    textEl.className = 'server-lan-text';
    textEl.textContent = t('lanServer.scanning');
    el.appendChild(textEl);

    var dotsEl = document.createElement('div');
    dotsEl.className = 'server-lan-dots';
    dotsEl.textContent = LAN_FRAMES[Math.floor(Date.now() / LAN_FRAME_MS) % LAN_FRAMES.length];
    el.appendChild(dotsEl);

    el.addEventListener('click', function() {
      self._select(LAN_HEADER_SENTINEL);
    });

    this._lanHeaderEl = el;
    return el;
  };

  /* ==========================================================
     LAN 服务器条目
     ========================================================== */
  ServerSelectionList.prototype._createLanEntry = function(server, index) {
    var self = this;

    var el = document.createElement('div');
    el.className = 'server-entry server-lan-entry';
    server._entryEl = el;

    var nameEl = document.createElement('div');
    nameEl.className = 'server-name';
    nameEl.textContent = t('lanServer.title');
    el.appendChild(nameEl);

    var motdEl = document.createElement('div');
    motdEl.className = 'server-motd';
    if (server.motd) motdEl.innerHTML = mcTextToHtml(server.motd);
    el.appendChild(motdEl);

    var addrEl = document.createElement('div');
    addrEl.className = 'server-lan-address';
    if (server.hideAddress) {
      addrEl.textContent = t('selectServer.hiddenAddress');
    } else {
      addrEl.textContent = server.address || '';
    }
    el.appendChild(addrEl);

    el.addEventListener('click', function() {
      self._select(server);
    });
    el.addEventListener('dblclick', function() {
      self._fireJoin(server);
    });

    return el;
  };

  /* ==========================================================
     普通服务器条目
     显示策略：
       图标 / 名称    —— 本地缓存，始终显示
       MOTD          —— pinging: "Pinging..." / unreachable: "Can't connect..."
                        incompatible: "Incompatible version" / 其它: server.motd
       玩家数 / 版本 —— 仅 successful / incompatible 时显示
       ping 图标     —— 按状态切换
     ========================================================== */
  ServerSelectionList.prototype._createEntry = function(server, index) {
    var self = this;
    var state = server.status || 'successful';
    var isIncompatible = state === 'incompatible';
    var isUnreachable  = state === 'unreachable';
    var isPinging      = state === 'pinging';
    var listLen        = this.servers.length;

    var customIcon = String(server.icon || this.defaultIcon).replace(/"/g, '\\"');

    var el = document.createElement('div');
    el.className = 'server-entry';
    el.dataset.index = index;
    server._entryEl = el;
    el._pingTick = 0;

    var iconWrap = document.createElement('div');
    iconWrap.className = 'server-icon-wrap';

    var iconEl = document.createElement('div');
    iconEl.className = 'server-icon';
    iconEl.style.backgroundImage =
      'url("' + customIcon + '"), url("' + this.defaultIcon + '")';
    iconWrap.appendChild(iconEl);

    var tint = document.createElement('div');
    tint.className = 'server-tint';
    iconWrap.appendChild(tint);

    var ovJoin     = mkOverlay('server-ov-join');
    var ovMoveUp   = mkOverlay('server-ov-move-up');
    var ovMoveDown = mkOverlay('server-ov-move-down');
    iconWrap.appendChild(ovJoin);
    iconWrap.appendChild(ovMoveUp);
    iconWrap.appendChild(ovMoveDown);

    el.appendChild(iconWrap);

    function mkOverlay(cls) {
      var d = document.createElement('div');
      d.className = 'server-ov ' + cls;
      d.style.backgroundImage = 'none';
      return d;
    }

    /* ---------- 名称（本地缓存，始终显示） ---------- */
    var nameEl = document.createElement('div');
    nameEl.className = 'server-name';
    nameEl.textContent = server.name || '';
    el.appendChild(nameEl);

    /* ---------- MOTD（ping 后才有） ---------- */
    var motdEl = document.createElement('div');
    motdEl.className = 'server-motd';
    if (isPinging) {
      motdEl.textContent = tOr('multiplayer.status.pinging', 'Pinging...');
    } else if (isUnreachable) {
      motdEl.textContent = tOr('multiplayer.status.cannot_connect', "Can't connect to server");
    } else if (isIncompatible) {
      motdEl.textContent = tOr('multiplayer.status.incompatible', 'Incompatible version');
    } else if (server.motd) {
      motdEl.innerHTML = mcTextToHtml(server.motd);
    }
    el.appendChild(motdEl);

    /* ---------- 玩家数 / 版本（ping 后才有） ---------- */
    var statusTextEl = document.createElement('div');
    statusTextEl.className = 'server-status-text';
    var statusText = '';

    if (!isPinging && !isUnreachable) {
      if (isIncompatible) {
        statusText = server.version || tOr('multiplayer.status.incompatible', 'Incompatible');
        statusTextEl.classList.add('server-status-incompat');
      } else if (server.statusText) {
        statusText = server.statusText;
      } else if (server.players) {
        statusText = server.players.online + '/' + server.players.max;
      }
    }
    statusTextEl.textContent = statusText;

    if (!isPinging && !isUnreachable) {
      if (server.playerList && server.playerList.length > 0) {
        statusTextEl.title = server.playerList.join('\n');
      } else if (server.players && server.players.online > 0) {
        statusTextEl.title = server.players.online + '/' + server.players.max + ' players';
      }
    }
    el.appendChild(statusTextEl);

    /* ---------- ping 图标 ---------- */
    var pingEl = document.createElement('div');
    pingEl.className = 'server-ping-icon';
    pingEl.style.backgroundImage = 'none';
    el.appendChild(pingEl);

    function updatePingIcon() {
      if (isPinging) {
        var t2 = (el._pingTick + index * 2) & 7;
        if (t2 > 4) t2 = 8 - t2;
        pingEl.style.backgroundImage =
          'url("' + SPRITE_DIR + 'pinging_' + (t2 + 1) + '.png")';
      } else if (isIncompatible) {
        pingEl.style.backgroundImage = 'url("' + SPRITE_DIR + 'incompatible.png")';
      } else if (isUnreachable) {
        pingEl.style.backgroundImage = 'url("' + SPRITE_DIR + 'unreachable.png")';
      } else {
        var ping = server.ping || 0;
        var idx;
        if (ping < 150)       idx = 5;
        else if (ping < 300)  idx = 4;
        else if (ping < 600)  idx = 3;
        else if (ping < 1000) idx = 2;
        else                  idx = 1;
        pingEl.style.backgroundImage =
          'url("' + SPRITE_DIR + 'ping_' + idx + '.png")';
      }
    }
    updatePingIcon();
    if (isPinging) el._updatePing = updatePingIcon;

    function relToIcon(clientX, clientY) {
      var r = iconWrap.getBoundingClientRect();
      if (!r.width || !r.height) return { x: -1, y: -1, inIcon: false };
      var nx = (clientX - r.left) / r.width  * 32;
      var ny = (clientY - r.top ) / r.height * 32;
      return { x: nx, y: ny, inIcon: (nx >= 0 && nx < 32 && ny >= 0 && ny < 32) };
    }

    function updateOverlays(rel) {
      var inRightHalf = rel.inIcon && rel.x >= 16;
      var inTopLeft   = rel.inIcon && rel.x < 16 && rel.y < 16;
      var inBotLeft   = rel.inIcon && rel.x < 16 && rel.y >= 16;

      ovJoin.style.backgroundImage =
        'url("' + SPRITE_DIR + (inRightHalf ? 'join_highlighted' : 'join') + '.png")';

      if (index > 0) {
        ovMoveUp.style.backgroundImage =
          'url("' + SPRITE_DIR + (inTopLeft ? 'move_up_highlighted' : 'move_up') + '.png")';
      } else {
        ovMoveUp.style.backgroundImage = 'none';
      }

      if (index < listLen - 1) {
        ovMoveDown.style.backgroundImage =
          'url("' + SPRITE_DIR + (inBotLeft ? 'move_down_highlighted' : 'move_down') + '.png")';
      } else {
        ovMoveDown.style.backgroundImage = 'none';
      }
    }

    function clearOverlays() {
      ovJoin.style.backgroundImage = 'none';
      ovMoveUp.style.backgroundImage = 'none';
      ovMoveDown.style.backgroundImage = 'none';
      if (self._touchClear === clearOverlays) self._touchClear = null;
    }

    el.addEventListener('mouseenter', function(e) {
      if (self._lastPointerType === 'touch') return;
      updateOverlays(relToIcon(e.clientX, e.clientY));
    });
    el.addEventListener('mousemove', function(e) {
      if (self._lastPointerType === 'touch') return;
      updateOverlays(relToIcon(e.clientX, e.clientY));
    });
    el.addEventListener('mouseleave', clearOverlays);

    el.addEventListener('pointerdown', function(e) {
      if (e.pointerType !== 'touch') return;
      if (self._touchClear && self._touchClear !== clearOverlays) self._touchClear();
      self._touchClear = clearOverlays;
      updateOverlays(relToIcon(e.clientX, e.clientY));
    });
    el.addEventListener('pointermove', function(e) {
      if (e.pointerType !== 'touch') return;
      if (self._touchClear && self._touchClear !== clearOverlays) {
        self._touchClear();
        self._touchClear = clearOverlays;
      }
      updateOverlays(relToIcon(e.clientX, e.clientY));
    });

    el.addEventListener('pointerup', function(e) {
      if (e.pointerType !== 'touch') return;
      pendingTouchClick = true;
      handleClick(relToIcon(e.clientX, e.clientY));
    });

    el.addEventListener('pointercancel', function() {
      pendingTouchClick = false;
      clearOverlays();
    });

    el.addEventListener('click', function(e) {
      if (pendingTouchClick) {
        pendingTouchClick = false;
        return;
      }
      handleClick(relToIcon(e.clientX, e.clientY));
    });

    function handleClick(rel) {
      if (rel.inIcon) {
        if (rel.x >= 16) { self._fireJoin(server); return; }
        if (rel.x < 16 && rel.y < 16 && index > 0) {
          self._fireMoveUp(server, index); return;
        }
        if (rel.x < 16 && rel.y >= 16 && index < listLen - 1) {
          self._fireMoveDown(server, index); return;
        }
      }
      self._select(server);
    }

    el.addEventListener('dblclick', function() { self._fireJoin(server); });

    return el;
  };

  /* ==========================================================
     选中
     ========================================================== */
  ServerSelectionList.prototype._select = function(server) {
    if (this.selected === server) {
      if (typeof this.onSelect === 'function') this.onSelect(server);
      return;
    }

    this.selected = server;

    var all = this.el.querySelectorAll('.server-entry, .server-lan-header');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');

    var targetEl = null;
    if (server === LAN_HEADER_SENTINEL) {
      targetEl = this._lanHeaderEl;
    } else if (server) {
      targetEl = server._entryEl;
    }
    if (targetEl) targetEl.classList.add('selected');

    if (typeof this.onSelect === 'function') this.onSelect(server);
  };

  ServerSelectionList.prototype.select = function(server) { this._select(server); };

  ServerSelectionList.prototype.clearSelected = function() {
    this.selected = null;
    var all = this.el.querySelectorAll('.server-entry, .server-lan-header');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');
    if (typeof this.onSelect === 'function') this.onSelect(null);
  };

  ServerSelectionList.prototype.getSelected = function() { return this.selected; };

  ServerSelectionList.prototype._fireJoin = function(server) {
    if (server && typeof server.onJoin === 'function') {
      try { server.onJoin.call(server); } catch (e) { console.error('[server] onJoin', e); }
      return;
    }
    if (typeof this.onJoin === 'function') this.onJoin(server);
  };

  ServerSelectionList.prototype._fireMoveUp = function(server, index) {
    if (typeof this.onMoveUp === 'function') this.onMoveUp(server, index);
  };

  ServerSelectionList.prototype._fireMoveDown = function(server, index) {
    if (typeof this.onMoveDown === 'function') this.onMoveDown(server, index);
  };

  ServerSelectionList.prototype._startPingAnimation = function() {
    var self = this;
    setInterval(function() {
      var entries = self.el.querySelectorAll('.server-entry');
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry._pingTick === undefined) continue;
        entry._pingTick++;
        if (entry._updatePing) entry._updatePing();
      }
    }, PING_FRAME_MS);
  };

  window.mcWidgets = window.mcWidgets || {};
  window.mcWidgets.ServerSelectionList = ServerSelectionList;
})();