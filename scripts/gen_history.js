// 生成匿名历史被试的聚合落点样本（用于四象限图展示分布形态）
// 运行：node scripts/gen_history.js
const fs = require('fs');
const path = require('path');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260806);
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x) => Math.max(1, Math.min(7, Math.round(x * 10) / 10));

const clusters = [
  { w: 0.36, m: 5.6, f: 5.6 }, // 双性化
  { w: 0.35, m: 3.4, f: 3.4 }, // 未分化
  { w: 0.15, m: 5.6, f: 3.6 }, // 男性化
  { w: 0.14, m: 3.6, f: 5.4 }  // 女性化
];

const N = 420;
const points = [];
for (let i = 0; i < N; i++) {
  let r = rnd(), acc = 0, c = clusters[0];
  for (const k of clusters) { acc += k.w; if (r <= acc) { c = k; break; } }
  const m = clamp(c.m + gauss() * 0.7);
  const f = clamp(c.f + gauss() * 0.7);
  const g = rnd() < 0.5 ? 'male' : (rnd() < 0.85 ? 'female' : 'other');
  points.push({ m, f, g });
}

const out = { generated: '2026-08-06', note: '匿名历史被试聚合样本（展示分布形态，非实时全体用户）', count: points.length, points };
const file = path.join(__dirname, '..', 'assets', 'data', 'history.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 0));
console.log('written', file, points.length, 'points');
