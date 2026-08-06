// BSRI 落点收集 · Cloudflare Worker + KV（免费、无需信用卡）
// 作用：真实累积每个填写者的 (M, F, 性别, 类型) 落点，前端 /api/points 即可读取真实全体分布。
//
// 部署步骤（约 5 分钟）：
//   1) 注册 Cloudflare 免费账号：https://dash.cloudflare.com/sign-up （免费版无需信用卡）
//   2) 左侧 Workers & Pages → KV → 新建命名空间，名称随意（如 bsri_points），记下它的 ID
//   3) 左侧 Workers & Pages → 创建 Worker，名称随意（如 bsri-api），运行时选默认的「Worker」
//   4) 把本文件内容粘贴进编辑器，保存并部署
//   5) 在该 Worker 的「设置 → 变量和机密 → KV 命名空间绑定」里，
//      绑定一个变量：变量名 POINTS，命名空间选第 2 步建的那个，保存
//   6) 部署后你会得到一个域名，形如 https://bsri-api.<你的子域>.workers.dev
//   7) 打开 index.html，把顶部 const API_BASE = '' 改成该域名：
//        const API_BASE = 'https://bsri-api.xxx.workers.dev';
//       （这样前端就会用真实落点；不填则仍用内置示例分布）
//
// 接口：
//   GET  /api/points  -> {"points":[{"m":..,"f":..,"type":..,"gender":..}, ...]}
//   POST /api/submit  -> body {"m":float,"f":float,"type":str,"gender":str}，返回 {"ok":true,"count":N}
//   OPTIONS           -> CORS 预检（已放行跨域）

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const KEY = 'points';          // KV 中存放全体落点的键
const MAX_KEEP = 5000;         // 最多保留最近 5000 条，控制体积

async function readAll(env) {
  const raw = await env.POINTS.get(KEY);
  return raw ? JSON.parse(raw) : [];
}
async function writeAll(env, arr) {
  await env.POINTS.put(KEY, JSON.stringify(arr));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (p === '/api/points') {
      const pts = await readAll(env);
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
      const pts = await readAll(env);
      pts.push({
        m: Math.max(1, Math.min(7, +m.toFixed(2))),
        f: Math.max(1, Math.min(7, +f.toFixed(2))),
        type: t, gender: g, ts: Date.now(),
      });
      const trimmed = pts.slice(-MAX_KEEP);
      await writeAll(env, trimmed);
      return new Response(JSON.stringify({ ok: true, count: trimmed.length }),
        { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    return new Response('BSRI points API — GET /api/points, POST /api/submit', { headers: CORS });
  },
};
