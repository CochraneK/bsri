/* =========================================================================
 * BSRI 测验 · 交互逻辑
 * ========================================================================= */
(function () {
  'use strict';

  var D = window.BSRI;
  var STORE_KEY = 'bsri_my_results_v1';
  var HISTORY_URL = 'assets/data/history.json';

  // —— 状态 ——
  var state = {
    gender: null,        // 'male' | 'female' | 'other'
    order: [],           // 打乱后的题项索引
    answers: {},         // {itemIndex: 1-7}
    scored: null,
    history: []          // [{m,f,g}]
  };

  // —— DOM ——
  var $ = function (s) { return document.querySelector(s); };
  var screens = {
    welcome: $('#screen-welcome'),
    quiz: $('#screen-quiz'),
    result: $('#screen-result')
  };
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('active', k === name); });
    window.scrollTo(0, 0);
  }

  // —— 性别选择 ——
  var genderGrid = $('#genderGrid');
  Array.prototype.forEach.call(genderGrid.children, function (el) {
    el.addEventListener('click', function () {
      state.gender = el.getAttribute('data-g');
      Array.prototype.forEach.call(genderGrid.children, function (c) {
        c.classList.remove('sel-m', 'sel-f', 'sel-o');
      });
      el.classList.add(state.gender === 'male' ? 'sel-m' : state.gender === 'female' ? 'sel-f' : 'sel-o');
      $('#startBtn').disabled = false;
    });
  });

  $('#startBtn').addEventListener('click', startQuiz);
  $('#submitBtn').addEventListener('click', submit);
  $('#restartBtn').addEventListener('click', function () { location.reload(); });
  $('#downDataBtn').addEventListener('click', downloadData);
  $('#downImgBtn').addEventListener('click', downloadImage);

  // —— 工具：洗牌（Fisher–Yates）——
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // —— 开始答题 ——
  function startQuiz() {
    state.order = shuffle(D.ITEMS.map(function (_, i) { return i; }));
    state.answers = {};
    var card = $('#quizCard');
    card.innerHTML = '';
    state.order.forEach(function (idx, pos) {
      var item = D.ITEMS[idx];
      var wrap = document.createElement('div');
      wrap.className = 'item';
      var q = document.createElement('div');
      q.className = 'q';
      q.innerHTML = '<span class="num">' + (pos + 1) + '.</span>' + item.text;
      var scale = document.createElement('div');
      scale.className = 'scale';
      for (var v = 1; v <= 7; v++) {
        (function (val) {
          var dot = document.createElement('div');
          dot.className = 'dot';
          dot.textContent = val;
          dot.dataset.val = val;
          dot.addEventListener('click', function () {
            state.answers[idx] = val;
            Array.prototype.forEach.call(scale.children, function (c) {
              c.classList.toggle('on', +c.dataset.val === val);
            });
            updateProgress();
          });
          scale.appendChild(dot);
        })(v);
      }
      var ends = document.createElement('div');
      ends.className = 'ends';
      ends.innerHTML = '<span>' + D.SCALE[0] + '</span><span>' + D.SCALE[6] + '</span>';
      wrap.appendChild(q); wrap.appendChild(scale); wrap.appendChild(ends);
      card.appendChild(wrap);
    });
    updateProgress();
    show('quiz');
  }

  function updateProgress() {
    var n = Object.keys(state.answers).length;
    $('#progText').textContent = n + ' / ' + D.ITEMS.length;
    $('#progBar').style.width = (n / D.ITEMS.length * 100) + '%';
    $('#submitBtn').disabled = n < D.ITEMS.length;
  }

  // —— 提交计分 ——
  function submit() {
    var arr = [];
    for (var i = 0; i < D.ITEMS.length; i++) arr[i] = state.answers[i] || null;
    var res = D.score(arr);
    state.scored = res;
    saveLocal(res);
    loadHistory(function () { renderResult(); show('result'); });
  }

  function saveLocal(res) {
    try {
      var rec = { t: Date.now(), g: state.gender, m: res.M, f: res.F, type: res.type };
      var list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      list.push(rec);
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) { /* 忽略隐私模式等异常 */ }
  }

  // —— 历史落点：优先加载 history.json，失败则用本地合成样本 ——
  function loadHistory(cb) {
    fetch(HISTORY_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) { state.history = j.points || []; cb(); })
      .catch(function () { state.history = synthHistory(); cb(); });
  }

  function synthHistory() {
    // 确定性伪随机，保证每次“样本”一致（展示分布形态）
    var seed = 20260806;
    function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function gauss() { var u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var clusters = [
      { w: 0.36, m: 5.6, f: 5.6, g: 'mix' },   // 双性化
      { w: 0.35, m: 3.4, f: 3.4, g: 'mix' },   // 未分化
      { w: 0.15, m: 5.6, f: 3.6, g: 'mix' },   // 男性化
      { w: 0.14, m: 3.6, f: 5.4, g: 'mix' }    // 女性化
    ];
    var pts = [], N = 420;
    for (var i = 0; i < N; i++) {
      var r = rnd(), acc = 0, c = clusters[0];
      for (var k = 0; k < clusters.length; k++) { acc += clusters[k].w; if (r <= acc) { c = clusters[k]; break; } }
      var m = clamp(c.m + gauss() * 0.7), f = clamp(c.f + gauss() * 0.7);
      var g = rnd() < 0.5 ? 'male' : (rnd() < 0.85 ? 'female' : 'other');
      pts.push({ m: m, f: f, g: g });
    }
    return pts;
  }
  function clamp(x) { return Math.max(1, Math.min(7, Math.round(x * 10) / 10)); }

  // —— 渲染结果报告 ——
  var reportHTML = '';
  function renderResult() {
    var res = state.scored;
    var T = D.TYPES[res.type];
    var R = D.REPORT[res.type];
    var genderName = state.gender === 'male' ? '男' : state.gender === 'female' ? '女' : '不愿透露';

    var strengths = R.strengths.map(function (s) { return '<li>' + s + '</li>'; }).join('');
    var watch = R.watch.map(function (s) { return '<li>' + s + '</li>'; }).join('');

    reportHTML =
      '<div class="card result-head">' +
        '<span class="tag">你的性别角色类型</span>' +
        '<div class="type-badge" style="background:' + T.color + '">' + T.name + '</div>' +
        '<p style="margin-top:6px;">' + R.headline + '</p>' +
        '<div class="scores">' +
          '<div class="score-box m"><div class="v">' + res.M.toFixed(1) + '</div><div class="k">男性化 M</div></div>' +
          '<div class="score-box f"><div class="v">' + res.F.toFixed(1) + '</div><div class="k">女性化 F</div></div>' +
        '</div>' +
        '<p class="muted">参考中位数：M ' + D.MEDIAN_M + ' ／ F ' + D.MEDIAN_F + '（高于则为“高”，低于则为“低”）</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="report-block"><h3><span class="ic">🔍</span>这是什么意思</h3><p>' + R.definition + '</p></div>' +
        '<div class="report-block"><h3><span class="ic">🌟</span>你可能的优势</h3><ul>' + strengths + '</ul></div>' +
        '<div class="report-block"><h3><span class="ic">🌱</span>可以留意的地方</h3><ul>' + watch + '</ul></div>' +
        '<div class="report-block"><h3><span class="ic">💡</span>给此刻的你</h3><div class="quote">' + R.suggest + '</div></div>' +
        '<div class="report-block"><h3><span class="ic">📚</span>研究视角（客观谨慎）</h3><p class="muted">' + R.research + '</p></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="note">🤝 你填写的性别是「' + genderName + '」。请记得：性别角色是光谱而非标签，' +
        '测验结果描述的是“特质倾向”，不定义你是谁，也不该成为别人评判你的依据。' +
        '今天的你，比任何一张图表都更丰富。</div>' +
      '</div>';

    $('#reportRoot').innerHTML = reportHTML;

    drawChart(res, state.gender, state.history);
    buildLegend();
  }

  // —— 四象限图绘制 ——
  function drawChart(res, gender, history) {
    var cv = $('#quad');
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var mL = 72, mR = 28, mT = 44, mB = 64;
    var pW = W - mL - mR, pH = H - mT - mB;
    var xToPx = function (v) { return mL + (v - 1) / 6 * pW; };
    var yToPx = function (v) { return mT + (1 - (v - 1) / 6) * pH; };

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    // 四象限底色
    var quad = [
      { x: xToPx(D.MEDIAN_M), y: mT, w: mL + pW - xToPx(D.MEDIAN_M), h: yToPx(D.MEDIAN_F) - mT, c: 'rgba(139,92,246,.07)' },       // 双性化 右上
      { x: mL, y: mT, w: xToPx(D.MEDIAN_M) - mL, h: yToPx(D.MEDIAN_F) - mT, c: 'rgba(236,72,153,.07)' },                          // 女性化 左上
      { x: xToPx(D.MEDIAN_M), y: yToPx(D.MEDIAN_F), w: mL + pW - xToPx(D.MEDIAN_M), h: mT + pH - yToPx(D.MEDIAN_F), c: 'rgba(59,130,246,.07)' }, // 男性化 右下
      { x: mL, y: yToPx(D.MEDIAN_F), w: xToPx(D.MEDIAN_M) - mL, h: mT + pH - yToPx(D.MEDIAN_F), c: 'rgba(100,116,139,.07)' }       // 未分化 左下
    ];
    quad.forEach(function (q) { ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, q.w, q.h); });

    // 坐标轴
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mL, mT); ctx.lineTo(mL, mT + pH); ctx.lineTo(mL + pW, mT + pH);
    ctx.stroke();

    // 刻度 1..7
    ctx.fillStyle = '#64748b'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    for (var t = 1; t <= 7; t++) {
      var px = xToPx(t);
      ctx.fillText(String(t), px, mT + pH + 26);
      var py = yToPx(t);
      ctx.textAlign = 'right'; ctx.fillText(String(t), mL - 12, py + 7); ctx.textAlign = 'center';
    }
    // 轴标题
    ctx.fillStyle = '#334155'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('男性化 M →', mL + pW / 2, H - 14);
    ctx.save(); ctx.translate(22, mT + pH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('女性化 F →', 0, 0); ctx.restore();

    // 中位数虚线
    ctx.setLineDash([8, 8]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xToPx(D.MEDIAN_M), mT); ctx.lineTo(xToPx(D.MEDIAN_M), mT + pH);
    ctx.moveTo(mL, yToPx(D.MEDIAN_F)); ctx.lineTo(mL + pW, yToPx(D.MEDIAN_F));
    ctx.stroke(); ctx.setLineDash([]);

    // 象限名
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(139,92,246,.55)'; ctx.fillText('双性化', (xToPx(D.MEDIAN_M) + mL + pW) / 2, mT + 30);
    ctx.fillStyle = 'rgba(236,72,153,.6)'; ctx.fillText('女性化', (mL + xToPx(D.MEDIAN_M)) / 2, mT + 30);
    ctx.fillStyle = 'rgba(59,130,246,.6)'; ctx.fillText('男性化', (xToPx(D.MEDIAN_M) + mL + pW) / 2, mT + pH - 14);
    ctx.fillStyle = 'rgba(100,116,139,.6)'; ctx.fillText('未分化', (mL + xToPx(D.MEDIAN_M)) / 2, mT + pH - 14);

    // 历史点
    var gColor = { male: '59,130,246', female: '236,72,153', other: '139,92,246' };
    history.forEach(function (p) {
      var c = gColor[p.g] || '100,116,139';
      ctx.fillStyle = 'rgba(' + c + ',.45)';
      ctx.beginPath(); ctx.arc(xToPx(p.m), yToPx(p.f), 5, 0, 2 * Math.PI); ctx.fill();
    });

    // 用户点（大圆环）
    var uc = gender === 'male' ? '#3b82f6' : gender === 'female' ? '#ec4899' : '#8b5cf6';
    var ux = xToPx(res.M), uy = yToPx(res.F);
    ctx.fillStyle = uc; ctx.globalAlpha = .25;
    ctx.beginPath(); ctx.arc(ux, uy, 20, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 5; ctx.strokeStyle = uc;
    ctx.beginPath(); ctx.arc(ux, uy, 14, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ux, uy, 7, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = uc; ctx.beginPath(); ctx.arc(ux, uy, 4, 0, 2 * Math.PI); ctx.fill();
  }

  function buildLegend() {
    var html =
      '<span><i style="background:#3b82f6"></i>历史·男</span>' +
      '<span><i style="background:#ec4899"></i>历史·女</span>' +
      '<span><i style="background:#8b5cf6"></i>历史·不愿透露</span>' +
      '<span><i style="background:#1f2937;border:2px solid #1f2937;"></i>你（当前）</span>';
    $('#legend').innerHTML = html;
  }

  // —— 下载作答数据（JSON，便于交给其他 AI）——
  function downloadData() {
    var res = state.scored;
    var answers = state.order.map(function (idx, pos) {
      var it = D.ITEMS[idx];
      return { no: pos + 1, text: it.text, dim: it.dim, value: state.answers[idx] };
    });
    var payload = {
      tool: 'BSRI 性别角色探索测验',
      version: '1.0',
      source: 'Bem (1974) Sex Role Inventory',
      completedAt: new Date().toISOString(),
      gender: state.gender,
      scores: { M: res.M, F: res.F, median_M: D.MEDIAN_M, median_F: D.MEDIAN_F },
      type: res.type,
      typeName: D.TYPES[res.type].name,
      answers: answers,
      note: '本数据仅供个人自我探索，非临床诊断。可将其提供给 AI 助手进行更个性化的交流。'
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'BSRI作答数据_' + Date.now() + '.json');
  }

  function triggerDownload(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // —— 下载报告截图 ——
  function downloadImage() {
    if (typeof html2canvas === 'undefined') {
      alert('截图组件未加载（可能是网络原因）。你仍可正常使用“下载作答数据”，或长按页面截图保存。');
      return;
    }
    var btn = $('#downImgBtn'); btn.disabled = true; btn.textContent = '生成中…';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;top:0;width:560px;background:#fff;padding:20px;font-family:sans-serif;color:#1f2937;';
    wrap.innerHTML = '<h2 style="text-align:center;margin:0 0 12px;">我的性别角色报告</h2>' + reportHTML;
    var img = document.createElement('img');
    img.src = $('#quad').toDataURL('image/png');
    img.style.cssText = 'display:block;width:340px;margin:14px auto;';
    wrap.appendChild(img);
    document.body.appendChild(wrap);
    html2canvas(wrap, { scale: 2, backgroundColor: '#ffffff' }).then(function (canvas) {
      canvas.toBlob(function (blob) { triggerDownload(blob, 'BSRI报告_' + Date.now() + '.png'); });
      wrap.remove();
      btn.disabled = false; btn.textContent = '📸 下载报告截图';
    }).catch(function () {
      alert('截图生成失败，请改用“下载作答数据”或长按截图。');
      wrap.remove(); btn.disabled = false; btn.textContent = '📸 下载报告截图';
    });
  }

})();
