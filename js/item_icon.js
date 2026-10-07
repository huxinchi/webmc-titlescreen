(function() {
  'use strict';
  if (window.mcItemIcon) return;

  var SIZE = 64;
  var MODELS_DIR      = 'assets/models/';
  var BLOCKSTATES_DIR = 'assets/blockstates/';
  var TEX_DIR         = 'assets/';
  var COLORMAP_DIR    = 'assets/colormap/';

  var glCanvas = null, gl = null, program = null;
  var uRotLoc = null, uTexLoc = null, uScaleLoc = null, uSkipRotLoc = null;
  var vertexBuffer = null;

  var glTextures = {};
  var dataURLCache = {};
  var modelCache = {};
  var bsCache = {};                 /* blockstate JSON 缓存 */
  var supportsWebGL = null;
  var renderQueue = Promise.resolve();

  /* ==========================================================
     物品 id → 方块 id
     复刻原版 BlockItem 的隐含映射（物品名 ≠ 方块名的情况）
     ========================================================== */
  var ITEM_TO_BLOCK = {
    'snow':           'snow_block',
    'redstone':       'redstone_wire',
    'wheat_seeds':    'wheat',
    'beetroot_seeds': 'beetroots',
    'melon_seeds':    'melon_stem',
    'pumpkin_seeds':  'pumpkin_stem',
    'sweet_berries':  'sweet_berry_bush',
    'nether_wart':    'nether_wart',
    'cocoa_beans':    'cocoa',
    'carrot':         'carrots',
    'potato':         'potatoes',
    'beetroot':       'beetroots',
    'kelp':           'kelp_plant'
  };

  /* ==========================================================
     Colormap
     ========================================================== */
  var COLORMAPS = {
    grass:       'grass.png',
    foliage:     'foliage.png',
    dry_foliage: 'dry_foliage.png'
  };
  var colormapData = {};
  var colormapPromise = null;
  var DEFAULT_TEMPERATURE = 0.5;
  var DEFAULT_DOWNFALL    = 1.0;
  var FALLBACK_TINTS = {
    grass:       [0.568, 0.741, 0.349],
    foliage:     [0.467, 0.631, 0.290],
    dry_foliage: [0.663, 0.545, 0.290]
  };

  function loadColormaps() {
    if (colormapPromise) return colormapPromise;
    var tasks = Object.keys(COLORMAPS).map(function(type) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
          try {
            var c = document.createElement('canvas');
            c.width = 256; c.height = 256;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            colormapData[type] = ctx.getImageData(0, 0, 256, 256).data;
          } catch (e) { colormapData[type] = null; }
          resolve();
        };
        img.onerror = function() { colormapData[type] = null; resolve(); };
        img.src = COLORMAP_DIR + COLORMAPS[type];
      });
    });
    colormapPromise = Promise.all(tasks);
    return colormapPromise;
  }

  function sampleColor(type, temperature, downfall) {
    var data = colormapData[type];
    if (!data) return FALLBACK_TINTS[type] || [1, 1, 1];
    var df = downfall * temperature;
    var x = Math.max(0, Math.min(255, Math.floor((1.0 - temperature) * 255)));
    var y = Math.max(0, Math.min(255, Math.floor((1.0 - df)          * 255)));
    var idx = (x * 256 + y) * 4;
    return [data[idx] / 255, data[idx + 1] / 255, data[idx + 2] / 255];
  }

  /* ==========================================================
     复刻 ItemColors.createDefault —— 物品 id → tint provider
     ========================================================== */
  var TINT_PROVIDERS = {
    'grass_block':              { cm: 'grass' },
    'short_grass':              { cm: 'grass' },
    'grass':                    { cm: 'grass' },
    'fern':                     { cm: 'grass' },
    'tall_grass':               { cm: 'grass' },
    'large_fern':               { cm: 'grass' },
    'sugar_cane':               { cm: 'grass' },
    'potted_fern':              { cm: 'grass' },

    'oak_leaves':               { cm: 'foliage' },
    'spruce_leaves':            { cm: 'foliage' },
    'birch_leaves':             { cm: 'foliage' },
    'jungle_leaves':            { cm: 'foliage' },
    'acacia_leaves':            { cm: 'foliage' },
    'dark_oak_leaves':          { cm: 'foliage' },
    'mangrove_leaves':          { cm: 'foliage' },
    'cherry_leaves':            { cm: 'foliage' },
    'azalea_leaves':            { cm: 'foliage' },
    'flowering_azalea_leaves':  { cm: 'foliage' },
    'vine':                     { cm: 'foliage' },
    'lily_pad':                 { cm: 'foliage' },

    'leaf_litter':              { cm: 'dry_foliage' },
    'bush':                     { cm: 'dry_foliage' },
    'cactus_flower':            { cm: 'dry_foliage' },

    'redstone':                 { rgb: [1.0, 0.0, 0.0] },
    'redstone_torch':           { rgb: [1.0, 0.0, 0.0] }
  };

  function getTintFor(id, tintIndex) {
    if (tintIndex !== 0) return null;
    var p = TINT_PROVIDERS[id];
    if (!p) return null;
    if (p.cm)  return sampleColor(p.cm, DEFAULT_TEMPERATURE, DEFAULT_DOWNFALL);
    if (p.rgb) return p.rgb;
    return null;
  }

  /* ==========================================================
     GL 初始化
     ========================================================== */
  function initGL() {
    if (gl) return true;
    if (supportsWebGL === false) return false;

    try {
      glCanvas = document.createElement('canvas');
      glCanvas.width = SIZE;
      glCanvas.height = SIZE;
      gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
        || glCanvas.getContext('experimental-webgl', { alpha: true });
      if (!gl) { supportsWebGL = false; return false; }

      var vs = [
        'attribute vec3 aPos;',
        'attribute vec2 aUV;',
        'attribute vec3 aColor;',
        'uniform mat3 uRot;',
        'uniform float uScale;',
        'uniform float uSkipRot;',
        'varying vec2 vUV;',
        'varying vec3 vColor;',
        'void main() {',
        '  vUV = aUV;',
        '  vColor = aColor;',
        '  vec3 p = uRot * aPos;',
        '  p = mix(p, aPos, uSkipRot);',
        '  gl_Position = vec4(p.x * uScale, p.y * uScale, p.z * 0.5, 1.0);',
        '}'
      ].join('\n');

      var fs = [
        'precision mediump float;',
        'uniform sampler2D uTex;',
        'varying vec2 vUV;',
        'varying vec3 vColor;',
        'void main() {',
        '  vec4 c = texture2D(uTex, vUV);',
        '  if (c.a < 0.05) discard;',
        '  gl_FragColor = vec4(c.rgb * vColor, c.a);',
        '}'
      ].join('\n');

      program = createProgram(vs, fs);
      if (!program) { supportsWebGL = false; return false; }

      uRotLoc     = gl.getUniformLocation(program, 'uRot');
      uTexLoc     = gl.getUniformLocation(program, 'uTex');
      uScaleLoc   = gl.getUniformLocation(program, 'uScale');
      uSkipRotLoc = gl.getUniformLocation(program, 'uSkipRot');
      vertexBuffer = gl.createBuffer();

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      supportsWebGL = true;
      return true;
    } catch (e) {
      supportsWebGL = false;
      return false;
    }
  }

  function createShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(vsSrc, fsSrc) {
    var v = createShader(gl.VERTEX_SHADER, vsSrc);
    var f = createShader(gl.FRAGMENT_SHADER, fsSrc);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    return p;
  }

  /* ==========================================================
     GUI 物品视角
     ========================================================== */
  function buildRotMat() {
    var a = 30 * Math.PI / 180;
    var b = -135 * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a);
    var cb = Math.cos(b), sb = Math.sin(b);
    var r = [
       cb,      0,    sb,
      -sa*sb,   ca,   sa*cb,
      -ca*sb,  -sa,   ca*cb
    ];
    return new Float32Array([
      r[0], r[3], r[6],
      r[1], r[4], r[7],
      r[2], r[5], r[8]
    ]);
  }

  /* ==========================================================
     模型 & blockstate 加载
     ========================================================== */
  function loadModelJSON(type, name) {
    var key = type + '/' + name;
    if (modelCache[key] !== undefined) return Promise.resolve(modelCache[key]);
    return fetch(MODELS_DIR + type + '/' + name + '.json')
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; })
      .then(function(m) { modelCache[key] = m; return m; });
  }

  function loadBlockstateJSON(blockId) {
    var key = 'bs/' + blockId;
    if (bsCache[key] !== undefined) return Promise.resolve(bsCache[key]);
    return fetch(BLOCKSTATES_DIR + blockId + '.json')
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; })
      .then(function(m) { bsCache[key] = m; return m; });
  }

  /* ==========================================================
     从 blockstate JSON 里选一个模型引用
     复刻原版 BlockStateModelLoader：
       - variants: {"snowy=false": {"model": "..."}}  → 优先 snowy=false，否则第一个
       - multipart: [{ apply: { model: "..." } }]     → 取第一个有 model 的 apply
     ========================================================== */
  function extractModelRef(v) {
    if (!v) return null;
    if (Array.isArray(v)) {
      for (var i = 0; i < v.length; i++) {
        var r = extractModelRef(v[i]);
        if (r) return r;
      }
      return null;
    }
    if (typeof v.model === 'string') return v.model;
    return null;
  }

  function pickModelRef(bs) {
    if (!bs) return null;

    /* variants */
    if (bs.variants && typeof bs.variants === 'object' && !Array.isArray(bs.variants)) {
      /* 优先"空状态"（无属性方块） */
      if (bs.variants[''] != null) {
        var r0 = extractModelRef(bs.variants['']);
        if (r0) return r0;
      }
      /* 其次优先 snowy=false（避免草方块变雪覆盖） */
      if (bs.variants['snowy=false'] != null) {
        var rS = extractModelRef(bs.variants['snowy=false']);
        if (rS) return rS;
      }
      /* 否则取第一个 */
      var keys = Object.keys(bs.variants);
      for (var i = 0; i < keys.length; i++) {
        var r = extractModelRef(bs.variants[keys[i]]);
        if (r) return r;
      }
    }

    /* multipart */
    if (Array.isArray(bs.multipart)) {
      for (var j = 0; j < bs.multipart.length; j++) {
        var part = bs.multipart[j];
        if (part && part.apply) {
          var r2 = extractModelRef(part.apply);
          if (r2) return r2;
        }
      }
    }

    return null;
  }

  /* "minecraft:block/snow_block" / "block/snow_block" / "snow_block"
     → { type: 'block'|'item', name: 'snow_block' } */
  function normalizeModelRef(ref) {
    if (!ref) return null;
    ref = String(ref).replace(/^minecraft:/, '');
    var parts = ref.split('/');
    if (parts.length === 1) {
      return { type: 'block', name: parts[0] };
    }
    if (parts[0] === 'block' || parts[0] === 'item') {
      return { type: parts[0], name: parts.slice(1).join('/') };
    }
    return { type: 'block', name: ref };
  }

  /* ==========================================================
     模型解析（保留 textures + elements）
     ========================================================== */
  function resolveModel(type, name, seen) {
    seen = seen || {};
    var key = type + '/' + name;
    if (seen[key]) return Promise.resolve(null);
    seen[key] = true;

    return loadModelJSON(type, name).then(function(model) {
      if (!model) return null;

      var ownTextures = model.textures || {};
      var ownElements = model.elements || [];

      if (!model.parent) {
        return { textures: ownTextures, elements: ownElements };
      }

      var pf = String(model.parent).replace(/^minecraft:/, '');
      var parts = pf.split('/');
      var pt = parts[0];
      var pn = parts.slice(1).join('/');
      if (pt !== 'block' && pt !== 'item') {
        return { textures: ownTextures, elements: ownElements };
      }

      return resolveModel(pt, pn, seen).then(function(pm) {
        if (!pm) return { textures: ownTextures, elements: ownElements };

        var mt = {};
        var k;
        for (k in pm.textures) mt[k] = pm.textures[k];
        for (k in ownTextures)  mt[k] = ownTextures[k];

        var elements = (ownElements && ownElements.length) ? ownElements : pm.elements;
        return { textures: mt, elements: elements || [] };
      });
    });
  }

  /* ==========================================================
     复刻原版 ItemRenderer 的模型解析路径：
       1. blockstates/<block_id>.json → 选模型 → 加载模型
       2. fallback: models/block/<block_id>.json
       3. fallback: models/item/<item_id>.json
     ========================================================== */
  function findModelForItem(itemId) {
    var blockId = ITEM_TO_BLOCK[itemId] || itemId;

    return loadBlockstateJSON(blockId).then(function(bs) {
      var ref = pickModelRef(bs);
      if (ref) {
        var norm = normalizeModelRef(ref);
        if (norm) {
          return resolveModel(norm.type, norm.name).then(function(m) {
            if (m) return m;
            return resolveModel('block', blockId);
          });
        }
      }
      return resolveModel('block', blockId);
    }).then(function(model) {
      if (model) return model;
      return resolveModel('item', itemId);
    });
  }

  function resolveTexPath(tex) {
    if (!tex) return null;
    var c = String(tex).replace(/^minecraft:/, '');
    if (c.charAt(0) === '#') return null;
    return TEX_DIR + c + '.png';
  }

  function resolveRef(tex, textures) {
    if (typeof tex !== 'string') return null;
    var seen = {};
    while (tex.charAt(0) === '#') {
      if (seen[tex]) return null;
      seen[tex] = true;
      tex = textures[tex.substring(1)];
      if (!tex) return null;
    }
    return tex;
  }

  /* ==========================================================
     几何
     ========================================================== */
  var CUBE_FACES = {
    north: { v: [[-0.5,0.5,-0.5],[-0.5,-0.5,-0.5],[0.5,-0.5,-0.5],[0.5,0.5,-0.5]], uv: [[0,0],[0,1],[1,1],[1,0]], c: [0.8,0.8,0.8] },
    south: { v: [[0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[-0.5,0.5,0.5]],       uv: [[0,0],[0,1],[1,1],[1,0]], c: [0.8,0.8,0.8] },
    east:  { v: [[0.5,0.5,-0.5],[0.5,-0.5,-0.5],[0.5,-0.5,0.5],[0.5,0.5,0.5]],       uv: [[0,0],[0,1],[1,1],[1,0]], c: [0.6,0.6,0.6] },
    west:  { v: [[-0.5,0.5,0.5],[-0.5,-0.5,0.5],[-0.5,-0.5,-0.5],[-0.5,0.5,-0.5]],   uv: [[0,0],[0,1],[1,1],[1,0]], c: [0.6,0.6,0.6] },
    up:    { v: [[-0.5,0.5,0.5],[-0.5,0.5,-0.5],[0.5,0.5,-0.5],[0.5,0.5,0.5]],       uv: [[0,0],[0,1],[1,1],[1,0]], c: [1.0,1.0,1.0] },
    down:  { v: [[-0.5,-0.5,-0.5],[-0.5,-0.5,0.5],[0.5,-0.5,0.5],[0.5,-0.5,-0.5]],   uv: [[0,0],[0,1],[1,1],[1,0]], c: [0.5,0.5,0.5] }
  };

  function faceToTri(face, tint) {
    var v = face.v, uv = face.uv, c = face.c;
    var idx = [0,1,2, 0,2,3];
    var out = [];
    var tr = tint ? tint[0] : 1;
    var tg = tint ? tint[1] : 1;
    var tb = tint ? tint[2] : 1;
    for (var i = 0; i < 6; i++) {
      var j = idx[i];
      out.push(v[j][0], v[j][1], v[j][2]);
      out.push(uv[j][0], uv[j][1]);
      out.push(c[0] * tr, c[1] * tg, c[2] * tb);
    }
    return new Float32Array(out);
  }

  function addCubeFace(faces, faceName, tex, textures, tint) {
    var real = resolveRef(tex, textures);
    var url = resolveTexPath(real);
    if (!url) return;
    var geo = CUBE_FACES[faceName];
    if (!geo) return;
    faces.push({ textureUrl: url, vertices: faceToTri(geo, tint) });
  }

  /* 从 elements 构建（优先路径） */
  function buildCubeFromElements(elements, textures, id) {
    var faces = [];

    elements.forEach(function(el) {
      var from = el.from, to = el.to;
      if (!from || !to) return;

      var isFull =
        from[0] === 0 && from[1] === 0 && from[2] === 0 &&
        to[0]   === 16 && to[1]   === 16 && to[2]   === 16;
      if (!isFull) return;

      var faceDefs = el.faces || {};
      ['down','up','north','south','west','east'].forEach(function(faceName) {
        var f = faceDefs[faceName];
        if (!f) return;

        var tex = f.texture;
        var tintIndex = (typeof f.tintindex === 'number') ? f.tintindex : -1;
        var tint = (tintIndex >= 0) ? getTintFor(id, tintIndex) : null;

        addCubeFace(faces, faceName, tex, textures, tint);
      });
    });

    return faces;
  }

  /* fallback：无 elements 时按纹理名推断 */
  function buildCubeFromTextures(textures, id) {
    var faces = [];

    if (textures.all) {
      var url = resolveTexPath(resolveRef(textures.all, textures));
      if (url) {
        var tint = getTintFor(id, 0);
        ['north','south','east','west','up','down'].forEach(function(n) {
          faces.push({ textureUrl: url, vertices: faceToTri(CUBE_FACES[n], tint) });
        });
      }
      return faces;
    }

    if (textures.top && textures.side) {
      var tTint = /grass_block_top/.test(String(resolveRef(textures.top, textures) || ''))
        ? getTintFor(id, 0) : null;
      addCubeFace(faces, 'up', textures.top, textures, tTint);
      addCubeFace(faces, 'down', textures.bottom || textures.side, textures);
      ['north','south','east','west'].forEach(function(n) {
        addCubeFace(faces, n, textures.side, textures);
      });
      return faces;
    }

    if (textures.end && textures.side) {
      addCubeFace(faces, 'up', textures.end, textures);
      addCubeFace(faces, 'down', textures.end, textures);
      ['north','south','east','west'].forEach(function(n) {
        addCubeFace(faces, n, textures.side, textures);
      });
      return faces;
    }

    if (textures.north) {
      ['north','south','east','west','up','down'].forEach(function(n) {
        addCubeFace(faces, n, textures[n], textures);
      });
      return faces;
    }

    return faces;
  }

  function buildCube(model, id) {
    var t = model.textures || {};
    var el = model.elements || [];

    if (el.length) {
      var faces = buildCubeFromElements(el, t, id);
      if (faces.length) return faces;
    }
    return buildCubeFromTextures(t, id);
  }

  function buildCross(textures, id) {
    var url = resolveTexPath(resolveRef(textures.cross, textures));
    if (!url) return [];

    var tint = getTintFor(id, 0);

    var baseVerts = [
      [-0.5,  0.5, 0],
      [-0.5, -0.5, 0],
      [ 0.5, -0.5, 0],
      [ 0.5,  0.5, 0]
    ];
    var uv = [[0,0],[0,1],[1,1],[1,0]];
    var c = [1,1,1];

    function rotY(v, a) {
      var co = Math.cos(a), si = Math.sin(a);
      return [v[0]*co + v[2]*si, v[1], -v[0]*si + v[2]*co];
    }

    var p1 = baseVerts.map(function(v){ return rotY(v,  Math.PI/4); });
    var p2 = baseVerts.map(function(v){ return rotY(v, -Math.PI/4); });

    return [
      { textureUrl: url, vertices: faceToTri({ v: p1, uv: uv, c: c }, tint) },
      { textureUrl: url, vertices: faceToTri({ v: p2, uv: uv, c: c }, tint) }
    ];
  }

  function buildPlane(textures) {
    var url = resolveTexPath(resolveRef(textures.layer0 || textures.all, textures));
    if (!url) return [];

    var scale = 0.85;
    var verts = [
      [-scale,  scale, 0],
      [-scale, -scale, 0],
      [ scale, -scale, 0],
      [ scale,  scale, 0]
    ];

    return [{
      textureUrl: url,
      vertices: faceToTri({
        v: verts,
        uv: [[0,0],[0,1],[1,1],[1,0]],
        c: [1,1,1]
      })
    }];
  }

  function buildFaces(model, id) {
    var t = model.textures || {};
    if (t.layer0) return buildPlane(t);
    if (t.cross)  return buildCross(t, id);
    if (t.all || t.north || t.top || t.end || t.side || (model.elements && model.elements.length)) {
      return buildCube(model, id);
    }
    return [];
  }

  /* ==========================================================
     贴图加载
     ========================================================== */
  function loadTextureGL(url) {
    if (!url) return Promise.resolve(null);
    if (url in glTextures) return Promise.resolve(glTextures[url]);

    return new Promise(function(resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        glTextures[url] = tex;
        resolve(tex);
      };
      img.onerror = function() { glTextures[url] = null; resolve(null); };
      img.src = url;
    });
  }

  /* ==========================================================
     渲染
     ========================================================== */
  function doRender(id) {
    if (!initGL()) return Promise.resolve(null);
    if (id in dataURLCache) return Promise.resolve(dataURLCache[id]);

    var itemId = String(id).replace(/^minecraft:/, '');

    return loadColormaps().then(function() {
      return findModelForItem(itemId);
    }).then(function(model) {
      if (!model) { dataURLCache[id] = null; return null; }

      var faces = buildFaces(model, itemId);
      if (!faces.length) { dataURLCache[id] = null; return null; }

      var urlSet = {};
      faces.forEach(function(f) { urlSet[f.textureUrl] = true; });
      var urls = Object.keys(urlSet);

      return Promise.all(urls.map(function(u) {
        return loadTextureGL(u).then(function(t) { return { url: u, tex: t }; });
      })).then(function(results) {
        var texMap = {};
        results.forEach(function(r) { texMap[r.url] = r.tex; });
        faces.forEach(function(f) { f.texture = texMap[f.textureUrl]; });

        gl.viewport(0, 0, SIZE, SIZE);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        var isPlane = !!(model.textures && model.textures.layer0);

        gl.uniformMatrix3fv(uRotLoc, false, buildRotMat());
        gl.uniform1f(uScaleLoc, 1.15);
        gl.uniform1i(uTexLoc, 0);
        gl.uniform1f(uSkipRotLoc, isPlane ? 1.0 : 0.0);
        gl.activeTexture(gl.TEXTURE0);

        var aPos   = gl.getAttribLocation(program, 'aPos');
        var aUV    = gl.getAttribLocation(program, 'aUV');
        var aColor = gl.getAttribLocation(program, 'aColor');
        var stride = 8 * 4;

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(aUV);
        gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 3 * 4);
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 5 * 4);

        faces.forEach(function(f) {
          if (!f.texture) return;
          gl.bindTexture(gl.TEXTURE_2D, f.texture);
          gl.bufferData(gl.ARRAY_BUFFER, f.vertices, gl.STATIC_DRAW);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });

        var dataURL = glCanvas.toDataURL('image/png');
        dataURLCache[id] = dataURL;
        return dataURL;
      });
    }).catch(function(e) {
      console.warn('[mcItemIcon] fail', id, e);
      dataURLCache[id] = null;
      return null;
    });
  }

  function renderIcon(id) {
    var task = function() { return doRender(id); };
    renderQueue = renderQueue.then(task, task);
    return renderQueue;
  }

  /* ==========================================================
     对外
     ========================================================== */
  window.mcItemIcon = {
    isSupported: function() { return initGL(); },
    render:      renderIcon,
    clearCache:  function() {
      dataURLCache = {};
      bsCache = {};
      modelCache = {};
    },
    sampleColor: sampleColor,
    getTintFor:  getTintFor
  };

  function preInit() { try { initGL(); } catch (e) {} }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preInit);
  } else {
    preInit();
  }

})();