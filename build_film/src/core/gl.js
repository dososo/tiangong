// Thin WebGL2 wrapper: programs, textures, framebuffers, meshes.
export function createGL(canvas, preserve = false) {
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: preserve });
  if (!gl) throw new Error('WebGL2 unavailable');
  for (const e of ['EXT_color_buffer_float', 'EXT_float_blend', 'OES_texture_float_linear', 'EXT_texture_filter_anisotropic', 'KHR_parallel_shader_compile']) gl.getExtension(e);
  const cc = gl.getExtension('EXT_clip_control');
  if (cc) cc.clipControlEXT(cc.LOWER_LEFT_EXT, cc.ZERO_TO_ONE_EXT);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const G = { gl, clipControl: !!cc, includes: {}, boundTex: 0 };

  G.compile = (type, src, name) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  };
  const resolve = (src) => src.replace(/^[ \t]*#include <(\w+)>[ \t]*$/gm, (_, n) => { if (!(n in G.includes)) throw new Error('missing include ' + n); return resolve(G.includes[n]); });
  G.prog = (name, vs, fs, opts = {}) => {
    const head = '#version 300 es\nprecision highp float;precision highp int;precision highp sampler2D;precision highp sampler3D;precision highp sampler2DArray;precision highp sampler2DShadow;\n' + (opts.defines ? Object.entries(opts.defines).map(([k, v]) => `#define ${k} ${v}\n`).join('') : '');
    const vsrc = head + resolve(vs), fsrc = head + resolve(fs);
    const V = G.compile(gl.VERTEX_SHADER, vsrc), F = G.compile(gl.FRAGMENT_SHADER, fsrc);
    const p = gl.createProgram(); gl.attachShader(p, V); gl.attachShader(p, F);
    ['aPos', 'aNor', 'aUv', 'aDat', 'iM0', 'iM1', 'iM2', 'iDat', 'iExt'].forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    const P = { name, p, u: null, ready: false };
    const finish = () => {
      if (P.ready) return;
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const show = (sh, src) => { const log = gl.getShaderInfoLog(sh); if (!log) return ''; const lines = src.split('\n'); const out = [log]; const seen = new Set(); for (const m of log.matchAll(/0:(\d+)/g)) { const ln = +m[1]; if (seen.has(ln)) continue; seen.add(ln); for (let i = Math.max(1, ln - 2); i <= ln + 1; i++) out.push(i + ': ' + (lines[i - 1] || '')); } return out.join('\n'); };
        throw new Error(`[${name}] link failed\nVS: ${show(V, vsrc)}\nFS: ${show(F, fsrc)}\n${gl.getProgramInfoLog(p)}`);
      }
      P.u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); let unit = 0;
      gl.useProgram(p);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i); const loc = gl.getUniformLocation(p, info.name); if (!loc) continue;
        const nm = info.name.replace(/\[0\]$/, '');
        const isS = [gl.SAMPLER_2D, gl.SAMPLER_3D, gl.SAMPLER_2D_ARRAY, gl.SAMPLER_2D_SHADOW, gl.SAMPLER_CUBE].includes(info.type);
        P.u[nm] = { loc, type: info.type, size: info.size, unit: isS ? unit++ : -1 };
        if (isS) gl.uniform1i(loc, P.u[nm].unit);
      }
      const nb = gl.getProgramParameter(p, gl.ACTIVE_UNIFORM_BLOCKS);
      for (let i = 0; i < nb; i++) { const bn = gl.getActiveUniformBlockName(p, i); gl.uniformBlockBinding(p, i, bn === 'Env' ? 0 : 1); }
      P.ready = true;
    };
    P.finish = finish;
    P.use = (vals) => {
      finish(); gl.useProgram(p);
      if (vals) P.set(vals);
      return P;
    };
    P.set = (vals) => {
      for (const k in vals) {
        const u = P.u[k]; if (!u) continue; const v = vals[k];
        if (u.unit >= 0) { gl.activeTexture(gl.TEXTURE0 + u.unit); const t = v.tex ? v : v; gl.bindTexture(t.target || gl.TEXTURE_2D, t.tex); continue; }
        switch (u.type) {
          case gl.FLOAT: u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
          case gl.INT: case gl.BOOL: gl.uniform1i(u.loc, v); break;
          case gl.INT_VEC2: gl.uniform2iv(u.loc, v); break;
          case gl.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v instanceof Float32Array ? v : Float32Array.from(v)); break;
          case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v instanceof Float32Array ? v : Float32Array.from(v)); break;
          default: throw new Error('uniform type ' + u.type + ' ' + k);
        }
      }
    };
    return P;
  };

  const FMT = {
    rgba8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE], srgb8: [gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE], r8: [gl.R8, gl.RED, gl.UNSIGNED_BYTE], rg8: [gl.RG8, gl.RG, gl.UNSIGNED_BYTE],
    rgba16f: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT], rgba32f: [gl.RGBA32F, gl.RGBA, gl.FLOAT], r32f: [gl.R32F, gl.RED, gl.FLOAT], rg32f: [gl.RG32F, gl.RG, gl.FLOAT], r16f: [gl.R16F, gl.RED, gl.HALF_FLOAT], rg16f: [gl.RG16F, gl.RG, gl.HALF_FLOAT], r11: [gl.R11F_G11F_B10F, gl.RGB, gl.HALF_FLOAT], rgb10: [gl.RGB10_A2, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV],
    d32f: [gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT],
  };
  G.tex2D = (w, h, fmt = 'rgba16f', o = {}) => {
    const [i, f, t] = FMT[fmt]; const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    if (o.source) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!o.flip); gl.texImage2D(gl.TEXTURE_2D, 0, i, f, t, o.source); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
    else if (o.mips && !o.data) gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(w, h))) + 1, i, w, h);
    else gl.texImage2D(gl.TEXTURE_2D, 0, i, w, h, 0, f, t, o.data || null);
    const lin = o.filter !== 'nearest';
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : lin ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
    const wr = o.wrap === 'repeat' ? gl.REPEAT : o.wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    if (o.mips && (o.source || o.data)) gl.generateMipmap(gl.TEXTURE_2D);
    if (o.aniso && aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, o.aniso);
    return { tex, target: gl.TEXTURE_2D, w, h, fmt };
  };
  G.tex3D = (w, h, d, fmt = 'rgba8', o = {}) => {
    const [i, f, t] = FMT[fmt]; const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, tex);
    const lv = o.mips ? Math.floor(Math.log2(Math.max(w, h, d))) + 1 : 1;
    gl.texStorage3D(gl.TEXTURE_3D, lv, i, w, h, d);
    if (o.data) gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, w, h, d, f, t, o.data);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
    return { tex, target: gl.TEXTURE_3D, w, h, d, fmt, levels: lv };
  };
  G.fbo = (colors, depth = null, w = 0, h = 0) => {
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    colors.forEach((c, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, c.tex, c.level || 0));
    let depthTex = null;
    if (depth === 'rb') { const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, w || colors[0].w, h || colors[0].h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
    else if (depth) { depthTex = depth; gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth.tex, 0); }
    gl.drawBuffers(colors.length ? colors.map((_, i) => gl.COLOR_ATTACHMENT0 + i) : [gl.NONE]);
    if (!colors.length) gl.readBuffer(gl.NONE);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo incomplete 0x' + st.toString(16));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, colors, depth: depthTex, w: w || (colors[0] && colors[0].w) || depth.w, h: h || (colors[0] && colors[0].h) || depth.h };
  };
  G.bind = (f, vp) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, f ? f.fb : null);
    if (vp) gl.viewport(...vp); else if (f) gl.viewport(0, 0, f.w, f.h); else gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const tri = gl.createVertexArray();
  G.FSQ = `out vec2 vUv; void main(){ vec2 p=vec2(gl_VertexID==1?3.:-1., gl_VertexID==2?3.:-1.); vUv=p*.5+.5; gl_Position=vec4(p,0.,1.); }`;
  G.fsq = () => { gl.bindVertexArray(tri); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  G.buf = (data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; };
  // attribute slots: 0 pos(3f) 1 nor(4 snorm8) 2 uv(2f) 3 dat(4 unorm8) | instance 4..6 mat rows(4f) 7 dat(4f) 8 ext(4f)
  G.mesh = (g) => {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const pb = G.buf(g.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const nb = G.buf(g.nor); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.BYTE, true, 0, 0);
    const ub = G.buf(g.uv); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    const db = G.buf(g.dat); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, false, 0, 0);
    const ib = G.buf(g.idx, gl.ELEMENT_ARRAY_BUFFER);
    const inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (let i = 0; i < 5; i++) { gl.enableVertexAttribArray(4 + i); gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, 80, i * 16); gl.vertexAttribDivisor(4 + i, 1); }
    gl.bindVertexArray(null);
    return { vao, n: g.idx.length, inst, cap: 0, count: 0, tris: g.idx.length / 3, bounds: g.bounds, idxType: g.idx instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, vb: [pb, nb, ub, db, ib] };
  };
  // second instance stream over the same vertex data
  G.view = (m) => {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const [pb, nb, ub, db, ib] = m.vb;
    gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, db); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); const inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (let i = 0; i < 5; i++) { gl.enableVertexAttribArray(4 + i); gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, 80, i * 16); gl.vertexAttribDivisor(4 + i, 1); }
    gl.bindVertexArray(null); return { ...m, vao, inst, cap: 0, count: 0 };
  };
  // inst: Float32Array of 20 floats per instance: 3 rows of affine matrix (12) + dat(4) + ext(4)
  G.setInstances = (m, arr, count) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.inst);
    if (count > m.cap) { m.cap = Math.max(count, 4); gl.bufferData(gl.ARRAY_BUFFER, m.cap * 80, gl.DYNAMIC_DRAW); }
    if (count) gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr, 0, count * 20); m.count = count;
  };
  G.draw = (m) => { if (!m.count) return; gl.bindVertexArray(m.vao); gl.drawElementsInstanced(gl.TRIANGLES, m.n, m.idxType, 0, m.count); };
  return G;
}
// std140 uniform block packer
export function makeUBO(gl, name, fields, binding) {
  let off = 0; const map = {}; let decl = `layout(std140) uniform ${name} {\n`;
  for (const f of fields) { const [n, t] = f.split(':'); const c = n.match(/(\w+)\[(\d+)\]/); const nm = c ? c[1] : n, cnt = c ? +c[2] : 1; const sz = (t === 'mat4' ? 16 : 4) * cnt; map[nm] = { off, sz }; off += sz; decl += `  ${t} ${n};\n`; }
  decl += '};\n';
  const data = new Float32Array(off); const b = gl.createBuffer(); gl.bindBuffer(gl.UNIFORM_BUFFER, b); gl.bufferData(gl.UNIFORM_BUFFER, data.byteLength, gl.DYNAMIC_DRAW); gl.bindBufferBase(gl.UNIFORM_BUFFER, binding, b);
  return { decl, data, set(n, v) { const m = map[n]; if (!m) throw new Error('ubo ' + n); for (let i = 0; i < v.length && i < m.sz; i++) data[m.off + i] = v[i]; }, upload() { gl.bindBuffer(gl.UNIFORM_BUFFER, b); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data); gl.bindBufferBase(gl.UNIFORM_BUFFER, binding, b); } };
}
