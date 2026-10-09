CSS 架构文档

一、总览

```
css/
├── import.css              入口，串联所有子样式
│
├── main.css                全局变量 / 字体 / 基础重置 / 高对比度主题
├── buttons.css             按钮（含所有尺寸变体）
├── textfield.css           文本框
├── slider.css              滑块 + 滚动条
├── object_select_list.css  通用对象选择列表
├── option_list.css         通用选项列表（键值对配置）
├── dialog.css              通用对话框
├── tooltip.css             通用悬浮提示
├── tab_bar.css             顶部标签栏
├── switch_grid.css         开关网格
│
├── pano.css                全景背景（所有页面）
├── index.css               主菜单布局
├── logos.css               主菜单 Logo + 闪烁标语
├── realm.css               主菜单 Realms 图标装饰
│
├── accessibility.css       无障碍设置页
├── options_screen.css      主选项页框架
├── world_select.css        单人世界选择列表
└── server_select.css       多人服务器选择列表
```

加载顺序

必须 import.css 在最前。子样式的 @import 顺序即级联顺序，后面的会覆盖前面的。比如 option_list.css 里对 .mc-options-row > .mcbtn 的宽度约束会覆盖 buttons.css 里 .mcbtn-150 的 width: 150px。

---

二、全局约定

CSS 变量

在 main.css 的 :root 定义：

变量 默认 作用
--ui-scale 1 GUI 缩放，JS 动态写入 <html> 或 body

在各页面 / 组件定义（按需覆盖）：

变量 定义位置 默认 作用
--font-size 各页面 10px 字号，被 * { font-size: 16px } 打压后需显式覆盖
--opt-ctrl-w option_list.css 150px 选项行小控件宽
--opt-gap option_list.css 8px 选项行内间隙
--opt-ctrl-big-w option_list.css 310px 选项行整行控件宽
--realm-expires-duration realms.html JS 1000ms 到期图标闪烁周期
--sb-w slider.css 6px * ui-scale 滚动条宽度
--splash-font-size logos.css JS 16px 闪烁标语字号

关于 * { font-size: 16px }

main.css 里有一句 *{ font-size: 16px; }，它直接命中每个元素，会打断 font-size 继承链。因此：

· 任何元素若要小字号，必须显式写 font-size: var(--font-size, 10px)，靠父级继承无效
· 这是本项目的既定约定，不是 bug

坐标系统一规则

凡处于 transform: scale(var(--ui-scale)) 容器内（如 .rcw-root / .rlswt-root / .options-screen）：

· 输入坐标：clientX / clientY / getBoundingClientRect() → 屏幕像素（已缩放）
· 输出到样式：style.left / style.top / style.width / clientWidth / offsetWidth → 布局像素（未缩放）
· 中间过渡：只用无量纲 ratio

混用会出 bug。参考 slider.js 里的 valueFromX 修正示例。

层级（z-index）

层 z-index 用途
#pano-canvas -2 WebGL 全景
#pano-css -2 CSS 全景回退
#pano-cover -1 全景黑幕
页面根容器 1 页面内容
#mc-tooltip 100000 通用 tooltip
#mc-dialog-root 999999 对话框遮罩

---

三、入口 —— import.css

```css
@import url('main.css');        /* 全局变量、字体、重置、hc 主题 */
@import url('buttons.css');
@import url('textfield.css');
@import url('slider.css');
@import url('object_select_list.css');
@import url('option_list.css');
@import url('dialog.css');
@import url('tooltip.css');
@import url('tab_bar.css');
@import url('switch_grid.css');
```

页面用法：

```html
<link rel="stylesheet" href="css/import.css">
<link rel="stylesheet" href="css/pano.css">   <!-- 通常一起引入 -->
```

页面私有样式直接写 <style> 或单独的 css 文件，不要改 import.css（除非是全局通用）。

---

四、基础层

main.css

职责：全局变量、@font-face、html/body 重置、高对比度主题。

关键选择器：

选择器 说明
:root 定义 --ui-scale
@font-face 'Minecraft' 加载 assets/font/minecraft.ttf
html, body 禁用选择、tap 高亮、appearance 统一
* font-size: 16px（见上方约定）
.version-text / .copyright-text 主菜单左下 / 右下角文字
html.hc 系列 高对比度主题（按钮白边、列表反色、输入框白边）

依赖：无。

被依赖：所有页面。

buttons.css

职责：所有按钮的通用样式和尺寸变体。

基础类 .mcbtn：

· 布局：inline-flex 居中、padding: 0 2px（对齐 Java TEXT_MARGIN）
· 视觉：无边框、background-size: 100% 100%、image-rendering: pixelated
· 文字：白色 + 阴影，字体继承
· 状态：:hover / :focus 高亮，:disabled 灰化

尺寸变体（每个尺寸有 3 张图：普通 / 高亮 / 禁用）：

类名 尺寸 用途
.mcbtn-long 200×20 通用长按钮
.mcbtn-half 98×20 半宽按钮（主菜单、确认框）
.mcbtn-icon 20×20 图标按钮
.mcbtn-310 310×20 整行按钮（options addBig）
.mcbtn-71 71×20 单人/多人菜单底排
.mcbtn-150 150×20 Select World / Sound Options
.mcbtn-210 210×20 CycleButton 常见尺寸
.mcbtn-44 44×20 SwitchGrid 开关
.mcbtn-80 80×20 Realms Reset World Cancel
.mcbtn-83 83×20 Realms Players Back
.mcbtn-85 85×20 Realms Backup Back
.mcbtn-90 90×20 Realms Configure World 底部
.mcbtn-95 95×20 Realms Create Realm Cancel
.mcbtn-97 97×20 Realms Reset / Create Realm Create
.mcbtn-100 100×20 Realms 顶部三按钮 / Switch Minigame
.mcbtn-106 106×20 Realms Settings
.mcbtn-120 120×20 Realms Backup Download
.mcbtn-153 153×20 Realms Select Template
.mcbtn-160 160×20 Realms Player
.mcbtn-170 170×20 Realms Slot Options
.mcbtn-205 205×20 Realms Reset Normal

特殊控件：

· .mc-lock-btn[data-state="unlocked\|locked"] — 20×20 锁按钮，data-state 决定贴图
· .mc-checkbox[data-checked="false\|true"] — 17×17 复选框，:focus 才高亮（对齐 Java）
· .mc-checkbox-row — 复选框 + 标签的整行组合，点击整行触发
· .mc-cycle-btn — CycleButton 基础类，由 cycle_button.js 挂载

素材约定：assets/button/button_{W}.png / button_highlighted_{W}.png / button_disabled_{W}.png。用 mcslice.sh 九宫格切片生成。

textfield.css

职责：.mc-input 文本框。

类 / 状态 视觉
.mc-input 200×20，text_field.png 背景，#E0E0E0 文字
.mc-input:focus text_field_highlighted.png 高亮
.mc-input:disabled / [readonly] 文字 #707070
.mc-input::placeholder #555555
.mc-input.search-hint::placeholder #AAAAAA 斜体

尺寸覆盖：默认 200 宽，通过 .mc-options-row > .mc-input 等父选择器覆盖。

slider.css

职责：滑块 + 原生滚动条美化。

滑块 .mc-slider：

· 结构：.mc-slider > .mc-slider-track + .mc-slider-handle
· 轨道 200×20，手柄 8×20
· 状态：:focus 高亮轨道，:hover / .dragging 高亮手柄
· .disabled 类：opacity: 0.5 + pointer-events: none
· .mc-slider-310 / .mc-slider-170：宽变体，素材不同

滚动条 .mc-scroll：

· 颜色取 scroller.png 直方图：#C0C0C0 主体、#808080 阴影
· scrollbar-width: thin + webkit 伪元素
· 宽度随 --ui-scale 缩放

pano.css

职责：全景背景（所有页面共用）。

三层：

层 技术 说明
#pano-canvas WebGL 真实 3D 全景，默认隐藏
#pano-css CSS 动画 回退方案，background-position 平移动画 300s 循环
#pano-cover 白色遮罩 0.5s 后 opacity → 0 淡出，隐藏初始化过程

tooltip.css

职责：通用 tooltip（#mc-tooltip）。

· 深紫黑背景 rgba(16,0,16,0.94)，边框 #2D0A63
· 最大宽 170px，白字，white-space: pre-wrap
· .visible 类控制显隐
· 由 js/tooltip.js 操作

dialog.css

职责：通用对话框。

· #mc-dialog-root — 全屏遮罩，backdrop-filter: blur(5px)
· .mc-dialog-box — 内容盒子，flex column
· .mc-dialog-title / .mc-dialog-message / .mc-dialog-buttons
· .mc-dialog-hidden 类隐藏

由 js/dialog.js（或类似模块）驱动。

---

五、通用组件

object_select_list.css

职责：通用列表（单选 / 双击触发）。

类 尺寸 / 说明
.mc-list 滚动容器，display: block（不用 flex 避免 shrink）
.mc-list-entry 270×18，居中，:hover 半透明白
.mc-list-entry.selected 背景 + 内描边 1px 白
.mc-list-entry-lg 36 高变体，左对齐

约定：.mc-list 是滚动容器，.mc-list-entry 是条目。条目可加自定义类，但宽高由本文件约束。参考 world_select.css 里 .world-entry 扩展。

option_list.css

职责：选项列表布局（键值对配置行）。

CSS 变量（父级可覆盖）：

· --opt-ctrl-w — 小控件宽，默认 150
· --opt-gap — 行内间隙，默认 8
· --opt-ctrl-big-w — 整行控件宽，默认 310

布局：

类 说明
.mc-options-row 一行两个控件，居中，宽 = ctrl-w * 2 + gap
.mc-options-row-big 整行控件，宽 = ctrl-big-w
.mc-options-header 分区标题，加粗下划线
.mc-options-slider-label 滑块值文本，居中浮于轨道上

行内控件统一约束：.mcbtn / .mc-slider / .mc-input 都强制 flex: 0 0 var(--opt-ctrl-w)，这解决了"输入框比按钮宽"的问题。

由 js/option_list.js 驱动渲染。

switch_grid.css

职责：开关网格（每行一个 label + 开关按钮）。

类 说明
.mc-switch-grid 容器，固定 310 宽，flex column
.mc-switch-item 单条
.mc-switch-row label + 按钮行
.mc-switch-label 左对齐文本，flex: 1
.mc-switch-info infoUnderneath 时的下方灰字

tab_bar.css

职责：顶部标签栏。

类 说明
.mc-tab-bar 24px 高，居中，底部 2px 黑线
.mc-tab-bar-inner 内部 flex 容器
.mc-tab-button 单个 tab，:hover / .selected 用不同贴图

素材：assets/tab/tab.png / tab_highlighted.png / tab_selected.png / tab_selected_highlighted.png。

---

六、主菜单

index.css

职责：主菜单布局。

· .screen — 逻辑坐标系容器，transform: scale(--ui-scale)
· .logo — 居中于 25% 高度
· #sstart / #mstart / #realms — 三个长按钮，top: 25% + 48/72/96px
· #friends / #lang / #accessibility — 三个图标按钮，top: 25% + 120px
· #option / #exit — 两个半宽按钮，top: 25% + 144px

logos.css

职责：Logo 和闪烁标语。

· .logo-minecraft — 256×44
· .logo-edition — 128×16
· .splash — 固定在 Logo 右上角，rotate(-20deg)
· .splash-text — 字号由 JS 写入，动画 splashBob 周期 1s
· .splash.hidden — hideSplashTexts 选项触发

realm.css

职责：主菜单 Realms 按钮上的通知图标装饰。

· #realms — position: relative（承载装饰）
· .realms-notif — 装饰图标基础类，display: none，JS 控制显隐
· #realms-news — 16×16
· #realms-invite — 15×25
· #realms-trial — 8×8
· #realms:disabled .realms-notifications — 按钮禁用时隐藏图标

由 js/show_realm.js 根据 cookie 决定显隐。

---

七、页面级

options_screen.css

职责：主选项页框架。

· .options-screen — 全屏 flex column
· .options-header — 61px 高，含标题 + FOV slider + Online 按钮
· .options-content — 滚动区，menu_list_background.png 平铺
· .options-footer — 33px 高，放 Done / Cancel

子页面复用：sound.html / video.html / controls.html 等都用这套框架。

accessibility.css

职责：无障碍设置页。

· .acc-screen — 全屏 flex column
· .acc-header — 33px 高，居中标题
· .acc-content — 滚动区
· .acc-footer — 33px 高，Done / Cancel 一行

结构比 options_screen.css 更简洁（没有 FOV 那一行）。

world_select.css

职责：单人世界选择列表。

· .world-entry — 继承 .mc-list-entry，覆盖为 36 高、flex row
· .world-icon-wrap — 32×32 图标容器
· .world-join / .world-alert — 悬停时出现的动作图标
· .world-info — 3 行文字（name / meta / info-text）
· .world-meta / .world-info-text — #808080 灰字

约定：条目本身由 JS 动态创建（createEntry），CSS 只负责视觉。

server_select.css

职责：多人服务器选择列表。

· .server-entry — 305×36，居中
· .server-icon-wrap / .server-icon — 32×32 图标 + 层叠兜底
· .server-tint — 悬停半透明遮罩
· .server-ov — 悬停时显示的覆盖层（join / move 图标）
· .server-name / .server-motd / .server-status-text
· .server-ping-icon — 10×8 网络信号图标
· .server-lan-header / .server-lan-entry — LAN 分区（结构不同于普通条目）

---

八、JS / CSS 配合约定

状态用 data-* 属性

```html
<button class="mcbtn mcbtn-106" data-state="open">...</button>
<div class="realms-status" data-state="expires_soon"></div>
<input class="mc-checkbox" data-checked="true">
<div class="mc-slider" data-min="0" data-max="1" data-step="0.01" data-value="0.5">
```

CSS 里用属性选择器：.realms-status[data-state="open"]。

显隐用类

```html
<div class="realms-popup visible">...</div>
<div class="mc-dialog-hidden">...</div>
```

优先用 .visible 或 .hidden 类切换，避免 JS 直接改 style.display。

尺寸用 CSS 变量

对齐 Java 的动态尺寸计算（如 row(i)），优先用 calc(50% ± Npx)，不要 JS 写 style.left。

例外：height/4 + 120 这种依赖视口高度的，JS 算完写 style.top（参考 realms_create_realm.html 的 layoutFooter）。

素材命名

类型 命名
按钮 assets/button/button_{W}.png / button_highlighted_{W}.png / button_disabled_{W}.png
滑块 assets/slider/slider.png / slider_highlighted.png / slider_handle.png / slider_handle_highlighted.png
滑块变体 assets/slider/slider_{W}.png
状态图标 assets/realm_status/{state}.png（两帧的用 _highlighted 后缀或纵向双帧）
Realms 图标 assets/realms/{name}.png（两帧的用 background-position 切）

---

九、常见坑

坑 说明 规避
* { font-size: 16px } 打断继承 任何小字必须显式覆盖 写 font-size: var(--font-size, 10px)
transform scale 下坐标混用 clientX 是屏幕坐标，clientWidth 是布局坐标 见"坐标系统一规则"
按钮尺寸类覆盖 .mcbtn-150 的 width: 150px 会被父选择器 .mc-options-row > .mcbtn 覆盖 需要固定尺寸时用更具体的选择器
九宫格拉伸 大尺寸按钮不要直接 transform: scale 用 mcslice.sh 生成对应尺寸素材
.mc-scroll 必须挂到滚动容器 挂在子元素上不生效 挂到 overflow-y: auto 的那个元素
高对比度主题 状态类要检查 html.hc 前缀 参考 main.css 底部规则

---

十、新增页面模板

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Page Title</title>

  <!-- 全景预加载（若页面用 pano） -->
  <link rel="preload" as="image" href="assets/background/panorama_equirect.png">

  <link rel="stylesheet" href="css/import.css">
  <link rel="stylesheet" href="css/pano.css">

  <style>
    /* 页面私有样式 */
    .my-root {
      position: fixed;
      top: 0; left: 50%;
      transform: translateX(-50%) scale(var(--ui-scale, 1));
      transform-origin: top center;
      width:  calc(100vw / var(--ui-scale, 1));
      height: calc(100vh / var(--ui-scale, 1));
      z-index: 1;
      overflow: hidden;
    }
    .my-title {
      font-size: var(--font-size, 10px);   /* ← 显式覆盖 */
    }
  </style>
</head>
<body>
  <canvas id="pano-canvas"></canvas>
  <div id="pano-css"></div>
  <div id="pano-cover"></div>

  <div class="my-root">...</div>

  <script src="js/main.js"></script>
  <script src="js/show_background.js"></script>
</body>
</html>
```

要点：

1. pano-* 三层始终一起出现（用不用全景都保留，作为背景）
2. 页面根容器必须 transform: translateX(-50%) scale(var(--ui-scale))
3. 所有 position: absolute 的元素坐标相对根容器
4. 文字显式写 font-size: var(--font-size, 10px)
5. 按钮用 .mcbtn .mcbtn-{W}，不手写 width/height