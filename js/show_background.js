(function() {
  'use strict';
  /* ============ 全景 ============ */
  const FACE_URLS = {
    px: 'assets/background/panorama_3.png',
    nx: 'assets/background/panorama_1.png',
    py: 'assets/background/panorama_4.png',
    ny: 'assets/background/panorama_5.png',
    pz: 'assets/background/panorama_2.png',
    nz: 'assets/background/panorama_0.png',
  };
const FOV = 70 * Math.PI / 180;
const tanHalfFov = Math.tan(FOV / 2);
const BASE_SPEED = -2 * Math.PI / (300 * 1000);

/* 全景速度倍率（可被 accessibility 设置改变） */
let panoramaSpeed = (typeof window.mcPanoramaSpeed === 'number') ? window.mcPanoramaSpeed : 1;
document.addEventListener('mc-option-change', function(e) {
  if (e.detail.key === 'options.accessibility.panorama_speed') {
    panoramaSpeed = e.detail.value;
  }
});

  const canvas  = document.getElementById('pano-canvas');
  const cssPano = document.getElementById('pano-css');

  let webglAlive = false;

  /* WebGL 成功：切到 canvas，关掉 CSS */
  function activateWebGL() {
    if (webglAlive) return;
    webglAlive = true;
    canvas.style.display = 'block';
    cssPano.style.display = 'none';
    console.log('[pano] WebGL active');
  }

  /* WebGL 失败：保留 CSS，删掉 canvas */
  function fallbackToCSS(reason) {
    if (webglAlive) return;
    console.warn('[pano] fallback to CSS:', reason || '');
    try { canvas.remove(); } catch (e) {}
  }

  /* ============ 尝试创建 WebGL ============ */
  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    }) || canvas.getContext('experimental-webgl', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
  } catch (e) {
    gl = null;
  }

  if (!gl) {
    fallbackToCSS('no webgl context');
  } else {
    try {
      runWebGL(gl);
    } catch (e) {
      fallbackToCSS('init error: ' + e.message);
    }
  }


  function runWebGL(gl) {
    const vsSource = `
      attribute vec2 aPos;
      varying vec2 vPos;
      void main() {
        vPos = aPos;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;
    const fsSource = `
      precision mediump float;
      varying vec2 vPos;
      uniform samplerCube uSampler;
      uniform mat3 uRot;
      uniform float uTanHalfFov;
      uniform float uAspect;
      void main() {
        vec3 dir = normalize(vec3(
          vPos.x * uAspect * uTanHalfFov,
          vPos.y * uTanHalfFov,
          -1.0
        ));
        dir = uRot * dir;
        dir.x = -dir.x;
        gl_FragColor = textureCube(uSampler, dir);
      }
    `;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error('shader: ' + gl.getShaderInfoLog(s));
      }
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,   1, -1,   -1,  1,
      -1,  1,   1, -1,    1,  1
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const targets = {
      px: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      nx: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      py: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      ny: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      pz: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      nz: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    };

    let loaded = 0;
    const total = 6;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    for (const [name, url] of Object.entries(FACE_URLS)) {
      const img = new Image();
      img.onload = () => {
        try {
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
          gl.texImage2D(targets[name], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          loaded++;
          if (loaded === total) {
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            startRendering();
          }
        } catch (e) {
          fallbackToCSS('texture upload: ' + e.message);
        }
      };
      img.onerror = () => fallbackToCSS('img load fail: ' + url);
      img.src = url;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr) || 1;
      const h = Math.floor(canvas.clientHeight * dpr) || 1;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener('resize', resize);

    const uSampler    = gl.getUniformLocation(prog, 'uSampler');
    const uRot        = gl.getUniformLocation(prog, 'uRot');
    const uTanHalfFov = gl.getUniformLocation(prog, 'uTanHalfFov');
    const uAspect     = gl.getUniformLocation(prog, 'uAspect');
    gl.uniform1i(uSampler, 0);

    let angle = 0;
    const rot = new Float32Array(9);
    let lastT = performance.now();
    let renderStarted = false;
    let pixelChecked = false;

    function updateRot() {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      rot[0] = c;   rot[1] = 0;  rot[2] = -s;
      rot[3] = 0;   rot[4] = 1;  rot[5] = 0;
      rot[6] = s;   rot[7] = 0;  rot[8] = c;
    }

    function draw() {
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      gl.uniformMatrix3fv(uRot, false, rot);
      gl.uniform1f(uTanHalfFov, tanHalfFov);
      gl.uniform1f(uAspect, canvas.width / canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function isCanvasBlack() {
      try {
        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h) return true;

        const points = [
          [Math.floor(w / 2),     Math.floor(h / 2)],
          [Math.floor(w / 4),     Math.floor(h / 4)],
          [Math.floor(w * 3 / 4), Math.floor(h / 4)],
          [Math.floor(w / 4),     Math.floor(h * 3 / 4)],
          [Math.floor(w * 3 / 4), Math.floor(h * 3 / 4)],
        ];

        const px = new Uint8Array(4);
        for (const [x, y] of points) {
          gl.readPixels(x, h - y - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (px[0] > 4 || px[1] > 4 || px[2] > 4) return false;
        }
        return true;
      } catch (e) {
        console.warn('readPixels failed:', e);
        return true;
      }
    }

    function render(t) {
      if (!webglAlive) return;
      if (!renderStarted) return;

      const dt = t - lastT;
      lastT = t;
angle += BASE_SPEED * panoramaSpeed * dt;
      updateRot();
      resize();
      draw();

      if (!pixelChecked) {
        pixelChecked = true;
        setTimeout(() => {
          if (isCanvasBlack()) {
            webglAlive = false;
            fallbackToCSS('canvas is black after first render');
          }
        }, 100);
      }

      requestAnimationFrame(render);
    }

    function startRendering() {
      if (renderStarted) return;
      renderStarted = true;

      lastT = performance.now();
      updateRot();
      resize();
      draw();

      setTimeout(() => {
        if (webglAlive) return;

        if (isCanvasBlack()) {
          fallbackToCSS('canvas is black (immediate)');
          return;
        }
        activateWebGL();
        requestAnimationFrame(render);
      }, 120);
    }
  }
})();