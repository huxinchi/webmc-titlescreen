(function() {
  'use strict';

  var STORAGE_KEY = 'mc_lang';
  var DEFAULT_LANG = 'en_us';

  /* ==========================================================
     支持的语言代码列表
     —— 由 extract_langs.py 自动生成（或手动粘贴其输出）
     ========================================================== */
  var SUPPORTED = [
    'af_za', 'ar_sa', 'ast_es', 'az_az',
    'ba_ru', 'be_by', 'bg_bg', 'br_fr',
    'bs_ba', 'ca_es', 'cs_cz', 'cv_cu',
    'cy_gb', 'da_dk', 'de_at', 'de_ch',
    'de_de', 'el_gr', 'en_au', 'en_ca',
    'en_gb', 'en_nz', 'en_pt', 'en_ud',
    'en_us', 'eo_uy', 'es_ar', 'es_cl',
    'es_ec', 'es_es', 'es_mx', 'es_uy',
    'es_ve', 'et_ee', 'eu_es', 'fa_ir',
    'fi_fi', 'fil_ph', 'fo_fo', 'fr_ca',
    'fr_ch', 'fr_fr', 'fra_de', 'fur_it',
    'fy_nl', 'ga_ie', 'gd_gb', 'gl_es',
    'go_fr', 'got_de', 'hal_ua', 'haw_us',
    'he_il', 'hi_in', 'hn_no', 'hr_hr',
    'hu_hu', 'hy_am', 'id_id', 'ig_ng',
    'io_en', 'is_is', 'it_it', 'ja_jp',
    'jbo_en', 'ka_ge', 'kk_kz', 'kn_in',
    'ko_kr', 'kw_gb', 'ky_kg', 'la_la',
    'lb_lu', 'li_li', 'lo_la', 'lol_us',
    'lt_lt', 'lv_lv', 'mk_mk', 'mn_mn',
    'ms_my', 'mt_mt', 'nds_de', 'nl_be',
    'nl_nl', 'nn_no', 'no_no', 'oc_fr',
    'pl_pl', 'pt_br', 'pt_pt', 'qcb_es',
    'qya_aa', 'ro_ro', 'ru_ru', 'ry_ua',
    'sah_sah', 'se_no', 'sk_sk', 'sl_si',
    'so_so', 'sq_al', 'sr_cs', 'sr_sp',
    'sv_se', 'ta_in', 'th_th', 'tl_ph',
    'tlh_aa', 'tr_tr', 'tt_ru', 'tzo_mx',
    'uk_ua', 'uz_uz', 'val_es', 'vec_it',
    'vi_vn', 'vp_vl', 'yi_de', 'yo_ng',
    'zh_cn', 'zh_hk', 'zh_tw'
];

  var currentLang = DEFAULT_LANG;
  var dict = {};
  var langIndex = null;         /* 由 index.json 提供 */
  var ready = false;
  var pending = [];

  /* ==========================================================
     语言代码归一化
     ========================================================== */
  function normalizeLang(code) {
    if (!code) return DEFAULT_LANG;
    return String(code).toLowerCase().replace(/-/g, '_').split('_').slice(0, 2).join('_');
  }

  function getSavedLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function saveLang(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
  }

  /* ==========================================================
     默认语言检测
     ========================================================== */
  function detectDefault() {
    var saved = getSavedLang();
    if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;

    var ua = navigator.language || navigator.userLanguage || DEFAULT_LANG;
    var norm = normalizeLang(ua);

    if (SUPPORTED.indexOf(norm) >= 0) return norm;
    if (norm.indexOf('zh') === 0 && SUPPORTED.indexOf('zh_cn') >= 0) return 'zh_cn';
    if (norm.indexOf('en') === 0 && SUPPORTED.indexOf('en_us') >= 0) return 'en_us';
    return DEFAULT_LANG;
  }

  /* ==========================================================
     应用翻译到 DOM
     ========================================================== */
  function applyTranslations() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].dataset.i18n;
      if (dict[key] != null) nodes[i].textContent = dict[key];
    }
    var nodes2 = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < nodes2.length; j++) {
      var key2 = nodes2[j].dataset.i18nPlaceholder;
      if (dict[key2] != null) nodes2[j].placeholder = dict[key2];
    }
    document.documentElement.setAttribute('lang', currentLang.replace('_', '-'));
    try {
      document.dispatchEvent(new CustomEvent('i18n-ready', {
        detail: { lang: currentLang }
      }));
    } catch (e) {}
  }

  /* ==========================================================
     加载
     ========================================================== */
  function fetchLang(code) {
    return fetch('assets/lang/' + code + '.json').then(function(r) {
      if (!r.ok) throw new Error('not found: ' + code);
      return r.json();
    });
  }

  function load(code) {
    return fetchLang(code).then(function(json) { dict = json; });
  }

function loadIndex() {
  /* ① 同步兜底：无论如何先填上 */
  langIndex = {};
  for (var i = 0; i < SUPPORTED.length; i++) {
    langIndex[SUPPORTED[i]] = { name: SUPPORTED[i], region: '' };
  }

  /* ② 异步尝试用 index.json 覆盖（有就用，没有就算了） */
  try {
    return fetch('assets/lang/index.json')
      .then(function(r) {
        if (!r.ok) throw new Error('index missing');
        return r.json();
      })
      .then(function(json) {
        if (json && typeof json === 'object') langIndex = json;
      })
      .catch(function() { /* 保留 ① 的兜底 */ });
  } catch (e) {
    /* fetch 同步抛错（file:// 等），保留 ① 的兜底 */
    return Promise.resolve();
  }
}

  /* ==========================================================
     启动
     ========================================================== */
/* ==========================================================
   MutationObserver —— 后续任何新增的 [data-i18n] 都补翻译
   ========================================================== */
var observer = null;
var observerTimer = null;

function startObserver() {
  if (observer || !document.body) return;

  observer = new MutationObserver(function(mutations) {
    var need = false;

    for (var i = 0; i < mutations.length && !need; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType !== 1) continue;   /* 只看元素节点 */
        if (node.hasAttribute &&
            (node.hasAttribute('data-i18n') ||
             node.hasAttribute('data-i18n-placeholder'))) {
          need = true; break;
        }
        if (node.querySelector) {
          if (node.querySelector('[data-i18n]') ||
              node.querySelector('[data-i18n-placeholder]')) {
            need = true; break;
          }
        }
      }
    }

    if (!need) return;

    /* 节流：同一批 DOM 变化里只补一次 */
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(function() {
      observerTimer = null;
      applyTranslations();
    }, 0);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/* ==========================================================
   启动
   ========================================================== */
function init() {
  loadIndex().then(function() {
    currentLang = detectDefault();
    load(currentLang)
      .catch(function() {
        currentLang = DEFAULT_LANG;
        return load(DEFAULT_LANG).catch(function() { dict = {}; });
      })
      .then(function() {
        ready = true;

        /* 首次翻译 */
        if (document.body) {
          applyTranslations();
          startObserver();
          pending.forEach(function(fn) { fn(); });
          pending = [];
        } else {
          document.addEventListener('DOMContentLoaded', function() {
            applyTranslations();
            startObserver();
            pending.forEach(function(fn) { fn(); });
            pending = [];
          }, { once: true });
        }
      });
  });
}

  /* ==========================================================
     对外接口
     ========================================================== */
  window.i18n = {
    t: function(key) {
      return dict[key] != null ? dict[key] : key;
    },

    getLang: function() { return currentLang; },
    setLang: function(code) {
      currentLang = code;
      saveLang(code);
      return load(code).then(function() { applyTranslations(); });
    },

    ready: function(fn) {
      if (ready) fn();
      else pending.push(fn);
    },

    /* 语言列表（同步，index.json 加载完后可用）
       返回 { code: { name, region } } */
    getLanguages: function() {
      return langIndex || {};
    },
    getLanguageCodes: function() {
      return langIndex ? Object.keys(langIndex).sort() : [];
    },
    getLanguage: function(code) {
      return langIndex ? langIndex[code] : null;
    },

    getSupportedCodes: function() { return SUPPORTED.slice(); },
    detectDefault: detectDefault,
    normalizeLang: normalizeLang
  };

  /* ==========================================================
   启动 —— 用 window.load 保证晚于所有同步 script + inline script
   这是 document.write 场景下唯一可靠的点
   ========================================================== */
function boot() {
  init();
}

if (document.readyState === 'complete') {
  boot();
} else {
  window.addEventListener('load', boot, { once: true });
}
})();