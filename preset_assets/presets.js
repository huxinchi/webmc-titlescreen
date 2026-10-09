(function() {
  'use strict';

  /* ==========================================================
     预置服务器表
     - 不在服务器列表里显示
     - 用户通过 Add Server / Direct Connection 输入 ip:port 时匹配
     - 匹配上 → 用这里的数据 + 调用这里的 handle
     - 匹配不上 → 视为无法连接

     key 规则：全部小写，含端口（默认 :25565）
     ========================================================== */
  window.mcServerPresets = {

    /* 示例： */
    'localhost:25565': {
      name:    'Local Server',
      motd:    '§aLocal test server',
      icon:    null,
      players: { online: 1, max: 20 },
      ping:    1,
      version: '1.21',
      status:  'successful',
      type:    'other',

      onJoin: function() {
        alert('Join ' + this.name);
      }
    },

    'example.com:25565': {
      name:    'Example Server',
      motd:    '§eWelcome to Example',
      icon:    null,
      players: { online: 42, max: 100 },
      ping:    47,
      version: '1.21',
      status:  'successful',
      type:    'other',

      onJoin: function() {
        alert('Join ' + this.name);
      }
    }

    /* 想加更多就按上面格式继续；不需要就删掉 */
  };

  /* ==========================================================
     匹配函数
     - 大小写归一
     - 无端口 → 补默认 25565
     - 命中 → { key, preset }，未命中 → null
     ========================================================== */
  window.mcMatchPreset = function(addr) {
    addr = String(addr || '').trim().toLowerCase();
    if (!addr) return null;

    if (addr.indexOf(':') < 0) addr += ':25565';

    var table = window.mcServerPresets || {};
    if (Object.prototype.hasOwnProperty.call(table, addr)) {
      return { key: addr, preset: table[addr] };
    }
    return null;
  };

})();