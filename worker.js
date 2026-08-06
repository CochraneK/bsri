// BSRI 落点收集 · Cloudflare Worker + KV（免费、无需信用卡）
// 经典 service worker 格式（addEventListener + 全局绑定），兼容性最好。
// 作用：真实累积每个填写者的 (M, F, 性别, 类型) 落点，前端 /api/points 即可读取真实全体分布。
//
// 部署（自动化脚本 cf_deploy.sh 已搞定；这里说明原理）：
//   - KV 命名空间 bsri-points 存放全体落点（键名 points）
//   - 本 Worker 绑定一个 KV 变量，变量名必须是 POINTS（全局可用，无需 env 参数）
//   - 部署后地址形如 https://polished-moon-b698.cunyikang.workers.dev
//
// 接口：
//   GET  /api/points  -> {"points":[{"m":..,"f":..,"type":..,"gender":..}, ...]}
//   POST /api/submit  -> body {"m":float,"f":float,"type":str,"gender":str}，返回 {"ok":true,"count":N}
//   OPTIONS           -> CORS 预检（已放行跨域，前端在 GitHub Pages 上也能调用）

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const KEY = 'points';          // KV 中存放全体落点的键
const MAX_KEEP = 5000;         // 最多保留最近 5000 条，控制体积

async function readAll() {
  const raw = await POINTS.get(KEY);   // POINTS 是 KV 全局绑定
  return raw ? JSON.parse(raw) : [];
}
async function writeAll(arr) {
  await POINTS.put(KEY, JSON.stringify(arr));
}

async function handle(request) {
  const url = new URL(request.url);
  const p = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (p === '/api/points') {
    const pts = await readAll();
    return new Response(JSON.stringify({ points: pts }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  if (p === '/api/submit' && request.method === 'POST') {
    let data;
    try { data = await request.json(); }
    catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'bad json' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }
    const m = Number(data.m), f = Number(data.f);
    if (!isFinite(m) || !isFinite(f)) {
      return new Response(JSON.stringify({ ok: false, error: 'm/f required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }
    const t = typeof data.type === 'string' ? data.type : 'unknown';
    const g = typeof data.gender === 'string' ? data.gender : 'unknown';
    const pts = await readAll();
    pts.push({
      m: Math.max(1, Math.min(7, +m.toFixed(2))),
      f: Math.max(1, Math.min(7, +f.toFixed(2))),
      type: t, gender: g, ts: Date.now(),
    });
    const trimmed = pts.slice(-MAX_KEEP);
    await writeAll(trimmed);
    return new Response(JSON.stringify({ ok: true, count: trimmed.length }),
      { headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  return new Response('BSRI points API — GET /api/points, POST /api/submit', { headers: CORS });
}

addEventListener('fetch', (event) => {
  event.respondWith(handle(event.request));
});
