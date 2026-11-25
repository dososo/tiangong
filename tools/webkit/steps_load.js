const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const t0 = performance.now(); const R = { vis: document.visibilityState, size: [innerWidth, innerHeight, devicePixelRatio] };
while (!(window.tg && document.querySelector('#start.ready')) && !document.querySelector('#start.bad') && performance.now() - t0 < 120000) await sleep(100);
R.ready = !!document.querySelector('#start.ready'); R.ms = Math.round(performance.now() - t0); R.msg = document.querySelector('#start p')?.textContent;
if (!R.ready) return JSON.stringify(R);
const gl = tg.E.gl; R.ext = gl.getSupportedExtensions(); R.gl = gl.getParameter(gl.VERSION); R.err0 = gl.getError(); R.pace = tg.pace();
return JSON.stringify(R);
