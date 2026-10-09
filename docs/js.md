JS 架构文档

一、总览

```
js/
├── main.js                 启动入口，按顺序 document.write 加载所有模块
│
├── option.js               选项存储（localStorage + 事件）
├── apply_option.js         把选项应用到 DOM
├── uiscale.js              UI 缩放计算
├── i18n.js                 国际化
├── font.js                 字体动态注入
│
├── slider.js               滑块 + 滚动条
├── checkbox.js             复选框
├── lock_button.js          锁按钮
├── cycle_button.js         循环按钮
├── option_list.js          通用选项列表
├── object_select_list.js   通用对象选择列表
├── switch_grid.js          开关网格
├── tab_manager.js          Tab 管理
│
├── world_select.js         单人世界列表
├── server_select.js        多人服务器列表
│
├── dialog.js               通用对话框
├── tooltip.js              通用悬浮提示
├── btn_back.js             页面跳转栈
├── clicksound.js           点击音效
├── narrator.js             朗读
├── keybinds.js             按键绑定
├── exit.js                 退出页面
│
├── item_icon.js            WebGL 物品图标渲染
├── resourcepacks.js        资源包管理
├── game_rules_data.js      游戏规则数据
│
├── show_background.js      全景背景
├── show_minecraft.js       主菜单彩蛋
├── show_realm.js           主菜单 Realms 图标
├── show_splash.js          主菜单闪烁标语
└── options_screen.js       选项页主逻辑
```

依赖关系：main.js 是唯一入口。页面只引 main.js + 页面私有脚本，不要单独引其它模块。

---

二、启动流程

main.js

职责：按顺序同步加载通用模块。

```js
var SCRIPTS = [
  'js/option.js',       // 1. 选项存储（最底层）
  'js/apply_option.js', // 2. 依赖 option
  'js/clicksound.js',
  'js/checkbox.js',
  'js/lock_button.js',
  'js/slider.js',
  'js/cycle_button.js',
  'js/option_list.js',  // 依赖 cycle_button / slider / option
  'js/object_select_list.js',
  'js/dialog.js',
  'js/tooltip.js',
  'js/tab_manager.js',
  'js/switch_grid.js',
  'js/item_icon.js',
  'js/btn_back.js',
  'js/uiscale.js',
  'js/keybinds.js',
  'js/i18n.js',         // 较晚，i18n-ready 事件要能触发
  'js/narrator.js',
  'js/resourcepacks.js'
];
```

约定：

· 顺序即依赖顺序。option.js 必须最先，i18n.js 靠后（它触发 i18n-ready）
· 用 document.write 而不是 appendChild，保证同步加载、执行顺序确定
· 从 document.currentScript.src 反推 base 路径，支持子目录部署

---

三、核心基础设施

option.js

职责：全局选项存储，类似 Java 的 Options.java。

存储：localStorage，key 前缀 mc_option.。

API：

```js
mcOptions.get(key, fallback)   // 读取，返回反序列化后的值
mcOptions.set(key, value)      // 写入 + 触发监听 + 派发 mc-option-change
mcOptions.on(key, fn)          // 注册监听（仅本页有效）
```

事件：document 上派发 mc-option-change，detail = { key, value }。

内置 key（DEFAULTS）：username。其余 key 由各页面自定义，无中心注册表。

约定：

· 不做跨标签页同步（无 storage 事件监听）
· mc-option-change 是页面级的，切页后会重新读取

apply_option.js

职责：把 mcOptions 的值应用到 DOM（不渲染控件）。

处理的 key：

Key 应用目标
options.accessibility.panorama_speed #pano-css 动画时长
options.hideSplashTexts .splash 显隐
options.accessibility.menu_background_blurriness #pano-css / #pano-canvas 的 filter: blur
options.accessibility.high_contrast <html class="hc">
options.guiScale 写入 mcGuiScaleOverride + 触发 mcUpdateUIScale
options.fullscreen 全屏切换（需用户手势，加载时不主动调）

监听：mc-option-change 事件，自动重新应用。

对外：window.mcApplyOptions() 手动触发全部应用。

uiscale.js

职责：计算 --ui-scale CSS 变量。

逻辑：

· mcGuiScaleOverride > 0 → 直接用该值（clamp 0.5~4）
· 否则 → min(innerWidth/640, innerHeight/480)，clamp 0.75~2

导出：window.mcUpdateUIScale。

监听：resize / orientationchange 自动重算。

i18n.js

职责：国际化。

存储：localStorage.mc_lang（语言代码）。

支持语言：硬编码的 SUPPORTED 数组（自动生成）。

加载流程：

1. loadIndex() — 尝试加载 assets/lang/index.json（带同步兜底）
2. detectDefault() — 按保存值 → 浏览器语言 → en_us 优先级
3. load(lang) — fetch('assets/lang/<lang>.json')
4. 应用翻译 + 派发 i18n-ready

DOM 约定：

· data-i18n="key" → 设置 textContent
· data-i18n-placeholder="key" → 设置 placeholder

MutationObserver：动态插入的 [data-i18n] 元素会被自动翻译。

API：

```js
i18n.t(key)                        // 翻译
i18n.getLang() / setLang(code)     // 当前/切换语言
i18n.ready(fn)                     // 就绪回调
i18n.getLanguages() / getLanguageCodes() / getLanguage(code)
i18n.getSupportedCodes()
i18n.detectDefault() / normalizeLang(code)
```

启动时机：等 window.load 后再 init()，避免 inline script 抢跑。

font.js

职责：动态注入 @font-face，支持运行时切字体。

机制：注入 <style id="mc-font-face">，晚于 main.css 的 @font-face，覆盖它。

存储：localStorage.mc_currentFont。

API：

```js
mcFont.apply()                     // 应用当前字体
mcFont.getCurrent() / setCurrent(name)
mcFont.register(name, url)         // 注册新字体
mcFont.list()
```

当前：只注册了 minecraft。

---

四、UI 控件

所有控件遵循同一套约定：

· CSS 类驱动（.mc-slider / .mc-checkbox / .mc-lock-btn / .mc-cycle-btn）
· data-* 属性存状态（data-checked / data-state / data-value）
· 自定义事件（slide / checkchange / lockchange / optionchange）
· window.mcWidgets 命名空间导出构造函数

slider.js

职责：滑块交互。

HTML 结构：

```html
<div class="mc-slider" data-min="0" data-max="1" data-step="0.1" data-value="0.5">
  <div class="mc-slider-track"></div>
  <div class="mc-slider-handle"></div>
</div>
```

事件：拖动时派发 slide，detail = { value }。

关键：valueFromX() 全用屏幕坐标（getBoundingClientRect），避免 --ui-scale 缩放下坐标混用。

API：

```js
mcWidgets.initSlider(el)
mcWidgets.initAllSliders()   // 扫描 .mc-slider:not(.inited)
```

生命周期：DOMContentLoaded 自动调 initAllSliders()；OptionList.render() 后也会手动调。

checkbox.js

职责：复选框交互（事件委托，不需初始化）。

HTML：

```html
<div class="mc-checkbox-row">
  <div class="mc-checkbox" data-checked="false"></div>
  <span>Label</span>
</div>
```

点击：.mc-checkbox-row 或 .mc-checkbox 都触发切换。

事件：checkchange，detail = { checked }。

API：

```js
mcWidgets.isChecked(el) / setChecked(el, bool)
```

lock_button.js

职责：锁按钮（类似 checkbox）。

HTML：

```html
<button class="mc-lock-btn" data-state="unlocked"></button>
```

事件：lockchange，detail = { locked }。

API：mcWidgets.isLocked / setLocked。

cycle_button.js

职责：循环按钮。

构造：

```js
new mcWidgets.CycleButton(el, {
  values:     [true, false],           // 候选值
  value:      true,                     // 初始值
  name:       'Label',                  // 显示名（或 labelKey）
  labelKey:   'options.xxx',            // i18n key
  displayState: 'NAME_AND_VALUE',       // VALUE / HIDE / NAME_AND_VALUE
  valueDisplayFn: function(v) {...},    // 自定义值显示
  valueStringifier: function(v) {...},  // 备用
  onChange:   function(v, self) {...},
  tResolver:  function(key) {...}       // 自定义翻译入口
});
```

交互：

· 左键 → 下一个
· Shift+左键 → 上一个
· 滚轮 → 前后

i18n：i18n-ready 时自动重建 label。

option_list.js

职责：选项列表（键值对配置行）。

构造：

```js
new mcWidgets.OptionsList(container, {
  options: { 'options.key': { type: 'boolean', value: false }, ... },
  rows: [ ['k1', 'k2'], ['k3'], { big: 'k4' }, { header: 'hdr' } ],
  // 可选：
  t:              function(key) {...},
  valueText:      function(opt, v) {...},
  fullLabel:      function(opt, v) {...},
  smallBtnCls:    'mcbtn mcbtn-150',       // 默认
  bigBtnCls:      'mcbtn mcbtn-310',
  smallSliderCls: 'mc-slider',
  bigSliderCls:   'mc-slider mc-slider-310'
});
```

选项类型：

· boolean — 二态（On/Off）
· enum — 枚举（values + valueKey/valueMap）
· chatBg — 聊天背景（chat / everywhere）
· slider — 滑块（min/max/step + format）
· button — 跳转链接

format 支持：percent / percentOrOff / intOrOff / chatOpacity / multiplier / chatDelay / framerate / guiScale / gamma / biomeBlend / chunks / blocks / anisotropy / chunkFade。

行内控件：每个控件的 data-key 属性等于其 key，方便页面用 querySelector 定位。

事件：

· 内部派发 optionchange（detail = { id, value }）
· 内部调 mcOptions.set() → 触发 mc-option-change

object_select_list.js

职责：通用对象列表（单选、双击）。

构造：

```js
new mcWidgets.ObjectSelectionList(container, {
  entrySelector: '.mc-list-entry',
  onSelect:   function(entry, data) {...},
  onInteract: function(entry, data) {...}
});
```

事件：select / interact / listchange。

选中时：自动滚动到视野中央（centerScrollOn）。

API：

```js
list.setSelected(entry)
list.getSelected() / getSelectedData() / clearSelected()
list.setData(entry, data)
```

switch_grid.js

职责：开关网格（label + 44×20 开关按钮）。

构造：

```js
var grid = new mcWidgets.SwitchGrid(310, {
  infoUnderneath: true,   // info 显示在下方（默认 tooltip）
  maxInfoRows:    2,
  rowSpacing:     4
});
grid.add({
  label:      'options.xxx',
  info:       'options.xxx.tooltip',
  get:        function() { return bool; },
  set:        function(v) { ... },
  activeWhen: function() { return enabled; }
});
container.appendChild(grid.el);
grid.refreshStates();
```

i18n：i18n-ready 时自动重建 label / info。

tab_manager.js

职责：Tab 页管理（对齐 MenuTabBar）。

API：

```js
var manager = new mcWidgets.TabManager({
  onSelected:   function(tab) {...},
  onDeselected: function(tab) {...}
});
var tab = new mcWidgets.Tab({ title: 'options.tab.xxx', content: domEl });
var bar = new mcWidgets.MenuTabBar(manager, { tabs: [tab1, tab2] });
bar.arrangeElements(width);   // 计算 tab 宽度
```

布局：doLayout 把内容顶部留 area.height / 6。

---

五、列表组件

world_select.js

职责：单人世界列表。

构造：

```js
var list = new mcWidgets.WorldSelectionList(container, {
  onSelect:   function(entry, world) {...},
  onInteract: function(entry, world) {...}
});
list.renderList(worlds);       // 或 list.setRows(worlds)
list.applyFilter(q);           // 搜索过滤
list.getSelected() / clearSelected() / select(world)
```

世界对象字段：

```js
{
  name: 'Test World',           // 名字
  folder: 'Test_World',         // 文件夹名
  lastPlayed: '2026/10/06 12:00',
  info: 'Survival Mode',
  icon: null,                    // 图标 URL
  join: 'join',                  // 'join' | 'marked_join'
  alert: '',                     // '' | 'warning' | 'error'

  onUpdate:      function() {...},   // 每次渲染前调用
  onJoin:        function() {...},
  onEdit:        function() {...},
  onDelete:      function() {...},
  onRecreate:    function() {...},
  onAlertClick:  function() {...}
}
```

基于 ObjectSelectionList。

server_select.js

职责：多人服务器列表（含 LAN 分区、ping 动画、touch 支持）。

构造：

```js
var list = new mcWidgets.ServerSelectionList(container, {
  defaultIcon: '...',
  onSelect:   function(server) {...},
  onJoin:     function(server) {...},
  onMoveUp:   function(server, index) {...},
  onMoveDown: function(server, index) {...}
});
list.setServers([...]);
list.setLanServers([...]);
```

服务器对象字段：

```js
{
  name: 'My Server',
  icon: '...',                    // 图标 URL
  status: 'successful',           // successful / incompatible / unreachable / pinging
  motd: '§aWelcome!',             // 支持 § 颜色码
  ping: 50,                       // 延迟（ms）
  players: { online: 3, max: 10 },
  playerList: ['Player1', 'Player2'],
  version: '1.20.4',
  statusText: '...',              // 覆盖默认的玩家数显示
  address: 'localhost',
  hideAddress: false              // LAN 时隐藏地址
}
```

LAN header：自动插入 .server-lan-header，可被选中（LAN_HEADER_SENTINEL）。

图标悬停：图标 32×32 分四区（右上 join、左上 move_up、左下 move_down），由 relToIcon 计算。

Touch 支持：pointerdown/move/up 模拟，去重用 pendingTouchClick 布尔标志。

Ping 动画：setInterval(100ms) 循环切换 pinging_{1-5}.png 帧。

---

六、交互工具

dialog.js

职责：通用对话框。

API：

```js
mcDialog.alert({ title, message, buttonText, onConfirm, onClose });
mcDialog.confirm({ title, message, yesText, noText, onYes, onNo, onClose });
mcDialog.open({ title, message, buttons: [{ text, onClick }] });
mcDialog.close() / isOpen()
```

行为：

· 遮罩层 #mc-dialog-root 全屏
· 对话框打开时拦截 Esc / Enter，不冒泡
· 按钮自动聚焦
· 一次只允许一个对话框

i18n：等 i18n.ready 再渲染，保证默认按钮文案正确。

tooltip.js

职责：通用悬浮提示。

触发：事件委托，鼠标悬停到 [data-tooltip] / [data-i18n-tooltip] / .mc-has-tooltip。

API：

```js
mcTooltip.attach(el, 'text' 或 function() { return 'text'; });
mcTooltip.detach(el);
mcTooltip.show(text, x, y);
mcTooltip.hide();
```

支持 § 颜色码：内部 mcTextToHtml 转换。

边界翻转：右/下越界时自动翻到左/上。

btn_back.js

职责：页面跳转栈（用 URL 的 fromurl 参数传递）。

栈格式：base64(JSON array of filenames)，如 WyJpbmRleC5odG1sIl0。

API：

```js
mcBack.back(fallbackUrl)             // pop 一层
mcBack.jump(targetUrl)               // push 当前页 + 跳
mcBack.jumpNoPush(targetUrl)         // 不 push，仅保留栈 + 跳
mcBack.backTo(page)                  // pop 到栈里某个页面（返回 bool）
mcBack.push(page)                    // 手动压栈
mcBack.getStack()                    // 读栈
```

自动拦截：

· .btn-back 元素 → 点击时 pop 栈
· 普通 <a href="*.html"> → 点击时 push 当前页 + 跳
· .btn-jmp → 不 push，仅保留栈
· .noback → 完全跳过（外链等）

约定：

· 不要直接 location.href = 'xxx.html'，除非是兜底
· jumpNoPush 用于中间页（connecting 等），返回时不会跳回中间页
· backTo 用于"清栈到某个位置"（如删除 Realm 后回主列表）

clicksound.js

职责：点击音效（assets/sound/click.ogg）。

触发：

· .mcbtn / .world-entry / .mc-lock-btn / .mc-checkbox 等的 pointerdown
· .mc-input 的 pointerdown
· lockchange / checkchange 事件

音量：0.7 * master * ui（来自 mcOptions）。

节流：150ms 内只播一次。

静默期：启动后 500ms 内不播。

对外：window.mcPlayClick()。

narrator.js

职责：朗读（Web Speech API）。

模式（options.narrator）：

· off — 关闭
· all — 全部朗读
· chat — 只朗读聊天（本项目未用）
· system — 只朗读系统消息

快捷键：Ctrl+B（macOS Cmd+B），受 options.accessibility.narrator_hotkey 控制。

触发点：focusin 交互元素、click（all 模式）、mc-option-change、i18n-ready。

API：

```js
mcNarrator.speak(text)
mcNarrator.narrate(el)
mcNarrator.isEnabled() / getMode() / isSupported()
```

keybinds.js

职责：按键绑定。

存储：localStorage.mc_keybind.<key>。

数据结构：KEYBINDS 数组，每条含 { key, category, default }。

API：

```js
mcKeybinds.get(key) / set(key, code) / reset(key) / getDefault(key)

mcKeybinds.onPressed(key, callback, {
  ignoreInputs: true,    // 输入框聚焦时不触发
  ignoreRepeat: true     // 长按 repeat 不触发
});  // 返回 dispose()
```

鼠标键：MOUSE0 / MOUSE1 / MOUSE2，onPressed 不响应（需调用方自己处理）。

UI 页：keybinds.html（未在本次提供的文件里，但 keybinds.js 内含渲染逻辑）。

exit.js

职责：退出页面（Chromium 漏洞）。

机制：触发 @font-feature-values 的 styleset Map 反复扩容，使 tab 崩溃。

API：exit() 全局函数。

兼容性：只对 Chrome 145.0.7632.75 以下有效，否则 alert() 提示不支持。

---

七、页面级

options_screen.js

职责：主选项页逻辑。

内容：

· 10 个跳转按钮（skin / sound / video / controls / lang / chat / resourcepack / accessibility / telemetry / credits）
· FOV slider（30~110，70 显示 "min"，110 显示 "max"）

i18n：i18n-ready 时重建 grid 和 slider label。

show_background.js

职责：全景背景。

双实现：

1. WebGL：立方体贴图 + fragment shader，6 张 panorama_{0-5}.png
2. CSS 回退：#pano-css 横向平移动画（pano.css）

激活流程：

· 尝试 WebGL → 6 张图加载完成 → 渲染第一帧 → readPixels 检查黑屏 → 通过则 activateWebGL()
· 任一步失败 → fallbackToCSS()

速度：options.accessibility.panorama_speed 控制，默认 1。

show_splash.js

职责：主菜单闪烁标语。

数据源：assets/texts/splashes.txt。

特殊日期：

· 12/24 → "Merry X-mas!"
· 1/1 → "Happy new year!"
· 10/31 → "OOoooOOOoooo! Spooky!"

彩蛋：哈希碰撞 125780783 的标语被排除。

用户名彩蛋：若随机索引恰好为 42 且用户名非空 → 显示 USERNAME IS YOU。

字号：按标语宽度动态计算 16 * 175 / (width + 32)。

show_realm.js

职责：主菜单 Realms 按钮的通知图标。

Cookie：

Cookie 语义
realms_news '1' → 显示 news 图标
realms_invite '' 隐藏 / '0' 灰 / '1' 亮
realms_trial '1' → 显示 trial 图标（闪烁）

布局：从右往左累加，间距 1px。

show_minecraft.js

职责：0.01% 概率把主菜单 Logo 换成 Minecraft 小 Logo。

---

八、游戏 / 资源

item_icon.js

职责：WebGL 渲染 MC 物品图标（64×64）。

核心：

· 加载 blockstates/<id>.json → 模型引用 → models/block/... 或 models/item/...
· 解析父模型、合并 textures、保留 elements
· 复刻 ItemColors：草方块 / 树叶 / 藤蔓等按 colormap 染色
· 渲染到 offscreen canvas → 导出 dataURL

API：

```js
mcItemIcon.render(id)         // Promise<dataURL | null>
mcItemIcon.isSupported()
mcItemIcon.clearCache()
mcItemIcon.getTintFor(id, tintIndex)
```

缓存：dataURLCache / modelCache / bsCache。

队列：renderQueue 串行执行，避免 GL 状态冲突。

resourcepacks.js

职责：资源包管理。

内置包：assets/resourcepacks/index.js 定义 window.__mcResourcePackIndex。

用户包：IndexedDB 存 { id, code, title, description, compatibility }，用 new Function(code) 执行。

包格式：

```js
window.__mcResourcePacks = window.__mcResourcePacks || {};
window.__mcResourcePacks['my_pack'] = {
  title: 'My Pack',
  description: '...',
  compatibility: 'compatible',
  apply:   function() { /* 应用 */ },
  unapply: function() { /* 撤销 */ }
};
```

API：

```js
mcResourcePacks.ready              // Promise
mcResourcePacks.getIndex()
mcResourcePacks.getPack(id)
mcResourcePacks.getSelected() / setSelected(ids)
mcResourcePacks.loadAll()
mcResourcePacks.importFile(file)   // 单 .js
mcResourcePacks.importFolder(files) // File[]
mcResourcePacks.deleteUserPack(id)
mcResourcePacks.onIndexChanged     // 页面挂载
mcResourcePacks.reload()
```

terminal 语义：列表里 terminal: true 的包是"生效底线"，它下面的包（UI 低优先级）全部跳过，它自己及之上的包才 apply。

game_rules_data.js

职责：纯数据文件，定义 __mcGameRules 和 __mcGameRuleCategories。

规则字段：

```js
{
  id:       'drowning_damage',        // 内部 id
  langKey:  'drowningDamage',         // i18n key（null 表示用新格式）
  type:     'bool' | 'int',
  default:  true,
  min / max: 0,                        // int 类型
  cat:      'player',                  // 分类
  feature:  'minecart_improvements'   // 可选，依赖的特性
}
```

---

九、模块依赖图

```
main.js
  ├── option.js  ←── 所有 UI 模块都读/写它
  ├── apply_option.js  ──┬── 监听 mc-option-change
  │                      └── 操作 pano-css / html.hc / splash
  ├── uiscale.js  ──→ 写 --ui-scale
  ├── i18n.js  ──→ 派发 i18n-ready
  │     ↑
  │     └── 所有 UI 模块监听 i18n-ready 重渲染
  │
  ├── slider.js ─┐
  ├── cycle_button.js ─┼──→ option_list.js
  ├── checkbox.js      │
  ├── lock_button.js   │
  ├── switch_grid.js ──┘
  │
  ├── object_select_list.js ──→ world_select.js
  ├── dialog.js
  ├── tooltip.js
  ├── btn_back.js
  ├── clicksound.js
  ├── keybinds.js
  ├── narrator.js
  └── resourcepacks.js

show_background.js  ── 页面单独引
item_icon.js        ── 页面单独引
```

---

十、全局约定

命名空间

命名空间 内容
window.mcOptions 选项存储
window.mcWidgets UI 控件构造器
window.mcDialog 对话框
window.mcTooltip Tooltip
window.mcBack 页面栈
window.mcI18n（即 window.i18n） 国际化
window.mcNarrator 朗读
window.mcKeybinds 按键绑定
window.mcItemIcon 物品图标
window.mcResourcePacks 资源包
window.mcFont 字体
window.mcGuiScaleOverride UI 缩放覆盖
window.mcUpdateUIScale 手动重算缩放
window.mcPlayClick 播放点击音效

事件

事件名 触发 detail
mc-option-change mcOptions.set { key, value }
i18n-ready i18n 加载完成 { lang }
slide slider 拖动 { value }
checkchange checkbox 切换 { checked }
lockchange lock 切换 { locked }
optionchange OptionsList 内控件变化 { id, value }
select / interact / listchange ObjectSelectionList —

CSS 类约定

类 作用
.mc-has-tooltip 标记有 tooltip 的元素
.inited 标记已初始化的 slider
.visible 显隐切换
.selected 列表项选中
.dragging slider 拖动中

data-* 约定

属性 用途
data-i18n / data-i18n-placeholder / data-i18n-tooltip i18n key
data-tooltip tooltip 文本
data-key OptionsList 内控件的 key
data-min / data-max / data-step / data-value slider
data-checked checkbox 状态
data-state lock / 状态图标
data-index 列表项索引

---

十一、常见坑

坑 说明 规避
脚本加载顺序 main.js 用 document.write 顺序加载，错一个就依赖断裂 加新模块时想清依赖位置
i18n-ready 时机 页面 inline script 可能在 i18n 之前跑 用 i18n.ready(fn) 包一层
data-i18n 翻译覆盖 元素上原有文本会被 i18n 覆盖 只对需要翻译的元素加 data-i18n
mcOptions.set 递归 在 mc-option-change 里再 set 会死循环 加 flag 或用 requestAnimationFrame
location.href 直跳 会丢 fromurl 栈 用 mcBack.jump / jumpNoPush / back
document.write 时机 页面加载完后调用会清空页面 只在 main.js 里用，页面内不要用
slider 坐标系统 transform scale 下混用坐标会偏移 见 CSS 文档的"坐标系统一规则"
options 跨页同步 mcOptions 不监听 storage 事件 页面切回时会重新读，但不会自动重渲染
对话框按键 dialog 打开时 Esc / Enter 被拦截 关掉 dialog 前不要依赖这两个键
tooltip 重渲染 [data-i18n-tooltip] 在 i18n-ready 前显示原文 tooltip 模块自带 i18n-ready 刷新
narrator 自动朗读 all 模式下 focus 会自动朗读 调试时先设 off

---

十二、新增模块模板

```js
(function() {
  'use strict';

  if (window.mcMyModule) return;   // 防重复加载

  /* ==========================================================
     依赖检查（可选）
     ========================================================== */
  if (!window.mcOptions) {
    console.warn('[mcMyModule] mcOptions not loaded');
    return;
  }

  /* ==========================================================
     内部状态
     ========================================================== */
  var state = {};

  /* ==========================================================
     主要逻辑
     ========================================================== */
  function init() {
    /* 挂事件、读配置 */
  }

  /* ==========================================================
     i18n 支持
     ========================================================== */
  if (window.i18n && window.i18n.ready) {
    window.i18n.ready(function() {
      /* 重建文本 */
    });
  }

  document.addEventListener('i18n-ready', function() {
    /* 同上 */
  }, false);

  /* ==========================================================
     启动
     ========================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ==========================================================
     对外
     ========================================================== */
  window.mcMyModule = {
    /* 公开 API */
  };
})();
```

要点：

1. IIFE 包裹，'use strict'
2. 防重复加载（if (window.mcMyModule) return;）
3. 依赖检查（mcOptions / mcWidgets 等）
4. i18n 双保险（i18n.ready + i18n-ready 事件）
5. 处理 readyState 两种时机
6. 挂到 window.mcXxx 命名空间

注册到 main.js：把文件名加到 SCRIPTS 数组的正确位置（考虑依赖）。