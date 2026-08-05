/* =========================================================================
 * BSRI 贝母性别角色量表 —— 数据与计分层
 * 来源：Bem, S. L. (1974). The measurement of psychological androgyny.
 *        Journal of Consulting and Clinical Psychology, 42(2), 155–162.
 * 说明：本文件为自洽的中文修订版（20 男性化 + 20 女性化 + 20 中性填充）。
 *       中性题用于降低社会赞许性偏差，不计入分类。
 * 重要：本测验仅供自我探索与科普，不构成任何临床诊断。
 * ========================================================================= */
(function (global) {
  'use strict';

  // —— 常模参考中位数（用于四象限分割线）——
  // 文献中常引用 Bem 大样本两性性度估计中值约 4.9；不同样本中位数在
  // 4.4–4.9 之间浮动。此处取常用值 4.9 / 4.9 作为参考分割线，并在报告中
  // 明确提示“参考线来自常模样本，个体解读需谨慎”。
  var MEDIAN_M = 4.9;
  var MEDIAN_F = 4.9;

  // 7 点量表标签
  var SCALE = [
    '完全不符合', // 1
    '基本不符合', // 2
    '比较不符合', // 3
    '不确定',     // 4
    '比较符合',   // 5
    '基本符合',   // 6
    '完全符合'    // 7
  ];

  // —— 男性化维度（20）——
  var MASC = [
    ['自我信赖的', 'self-reliant'],
    ['维护自己的信念', 'defends own beliefs'],
    ['独立的', 'independent'],
    ['充满活力的', 'athletic'],
    ['果断自信的', 'assertive'],
    ['个性坚强的', 'strong personality'],
    ['强劲有力的', 'forceful'],
    ['善于分析的', 'analytical'],
    ['具有领导能力的', 'has leadership ability'],
    ['乐于冒险的', 'willing to take risks'],
    ['易于做决定的', 'makes decisions easily'],
    ['自给自足的', 'self-sufficient'],
    ['有支配力的', 'dominant'],
    ['有男性气概的', 'masculine'],
    ['敢于表明立场的', 'willing to take a stand'],
    ['富有攻击性的', 'aggressive'],
    ['像领导者一样', 'acts as a leader'],
    ['个人主义的', 'individualistic'],
    ['有竞争意识的', 'competitive'],
    ['雄心勃勃的', 'ambitious']
  ];

  // —— 女性化维度（20）——
  var FEM = [
    ['深情款款的', 'affectionate'],
    ['快活的', 'cheerful'],
    ['孩子气的', 'childlike'],
    ['有同情心的', 'compassionate'],
    ['不说粗俗言语的', 'does not use harsh language'],
    ['乐于安抚伤痛的', 'eager to soothe hurt feelings'],
    ['有女性气质的', 'feminine'],
    ['容易接受恭维的', 'flatterable'],
    ['温和的', 'gentle'],
    ['容易轻信他人的', 'gullible'],
    ['热爱孩子的', 'loves children'],
    ['忠诚的', 'loyal'],
    ['对他人需求敏感的', 'sensitive to others\' needs'],
    ['害羞的', 'shy'],
    ['说话柔声细语的', 'soft-spoken'],
    ['表示同情的', 'sympathetic'],
    ['温柔的', 'tender'],
    ['善解人意的', 'understanding'],
    ['温暖的', 'warm'],
    ['柔顺的', 'yielding']
  ];

  // —— 中性维度 / 社会赞许性填充（20，不计分）——
  var NEU = [
    ['适应性强的', 'adaptable'],
    ['自高自大的', 'conceited'],
    ['认真尽责的', 'conscientious'],
    ['因循守旧的', 'conventional'],
    ['友好的', 'friendly'],
    ['感到幸福的', 'happy'],
    ['乐于助人的', 'helpful'],
    ['效率低下的', 'inefficient'],
    ['爱嫉妒的', 'jealous'],
    ['讨人喜欢的', 'likable'],
    ['喜怒无常的', 'moody'],
    ['值得信赖的', 'reliable'],
    ['诚恳真诚的', 'sincere'],
    ['庄严稳重的', 'solemn'],
    ['老练得体的', 'tactful'],
    ['爱表现的', 'theatrical'],
    ['诚实的', 'truthful'],
    ['难以预测的', 'unpredictable'],
    ['缺乏条理的', 'unsystematic'],
    ['富有的', 'wealthy']
  ];

  // 组装成统一题项列表（带维度标签，便于计分）
  var ITEMS = [];
  MASC.forEach(function (it) { ITEMS.push({ text: it[0], en: it[1], dim: 'M' }); });
  FEM.forEach(function (it) { ITEMS.push({ text: it[0], en: it[1], dim: 'F' }); });
  NEU.forEach(function (it) { ITEMS.push({ text: it[0], en: it[1], dim: 'N' }); });

  // —— 计分与分类 ——
  // answers: 数组，长度 60，元素为 1-7 的整数（未答为 null/undefined）
  function score(answers) {
    var mSum = 0, mCnt = 0, fSum = 0, fCnt = 0, answered = 0;
    for (var i = 0; i < ITEMS.length; i++) {
      var v = answers[i];
      if (v == null) continue;
      answered++;
      if (ITEMS[i].dim === 'M') { mSum += v; mCnt++; }
      else if (ITEMS[i].dim === 'F') { fSum += v; fCnt++; }
    }
    var M = mCnt ? mSum / mCnt : 0;
    var F = fCnt ? fSum / fCnt : 0;
    var type;
    if (M >= MEDIAN_M && F >= MEDIAN_F) type = 'androgynous';
    else if (M >= MEDIAN_M && F < MEDIAN_F) type = 'masculine';
    else if (F >= MEDIAN_F && M < MEDIAN_M) type = 'feminine';
    else type = 'undifferentiated';
    return { M: round1(M), F: round1(F), type: type, answered: answered };
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  // 类型元信息
  var TYPES = {
    androgynous:    { key: 'androgynous',    name: '双性化',   color: '#8b5cf6', short: '能动 + 共情，双高' },
    masculine:     { key: 'masculine',     name: '男性化',   color: '#3b82f6', short: '能动高 · 共情低' },
    feminine:      { key: 'feminine',      name: '女性化',   color: '#ec4899', short: '共情高 · 能动低' },
    undifferentiated: { key: 'undifferentiated', name: '未分化', color: '#64748b', short: '两类均偏中性' }
  };

  // —— 暖心 · 启发 · 客观谨慎 的报告文案 ——
  var REPORT = {
    androgynous: {
      headline: '你身上同时住着“力量”与“温柔”',
      definition: '你的能动性特质（独立、果断、竞争、自信）与表达性特质（温柔、共情、体贴）都明显突出。用贝母的话说，你没有被单一性别脚本框住。',
      strengths: [
        '既能果敢上前，也能温柔靠近——在不同情境里灵活切换；',
        '研究普遍发现，双性化与更高的自尊、更好的压力应对、更满意的人际关系相关；',
        '你较少被“男/女该怎样”的刻板印象束缚，拥有更宽的自我表达光谱。'
      ],
      watch: [
        '有时外界会不自觉地期待你“什么都能扛”，请记得承认局限、允许自己脆弱；',
        '两类特质都高，在角色冲突时也可能产生内耗——你不必时刻完美。'
      ],
      suggest: '把这份灵活当作礼物：在需要决断时上前，在需要陪伴时靠近。可以常问自己一句——“此刻的我，更需要力量，还是更需要温柔？”',
      research: 'Bem (1974) 提出“心理双性化”概念；后续研究多显示其与心理适应指标正相关，但效应受文化、测量方式影响，请把它当作一种倾向，而非定论。'
    },
    masculine: {
      headline: '你有一股稳稳向前的力量感',
      definition: '你的能动性特质（独立、果断、竞争、自信）明显强于表达性特质。你更常被“做成事、担起责”的那一面定义。',
      strengths: [
        '目标感强、临事不乱、敢于担当；',
        '在需要决策、领导与突破的情境里往往如鱼得水；',
        '高男性化得分通常与自我效能感、掌控感正相关。'
      ],
      watch: [
        '社会常鼓励“少流露情绪”，你可能低估了自己表达与求助的需要；',
        '适度示弱不是软弱，而是与他人建立真实联结的开始。'
      ],
      suggest: '试着在信任的关系里，练习说出一句“我其实也有点累 / 有点在意”。把“照顾他人”也慢慢纳入你的能力清单——那不是弱点，是另一种力量。',
      research: '高男性化得分与自我效能、掌控感相关；但只强调能动性，可能压缩情感表达的空间，适度整合共情特质对关系更有利。'
    },
    feminine: {
      headline: '你让周围的人感到被接住',
      definition: '你的表达性特质（温柔、共情、体贴、善解人意）明显强于能动性特质。你更常被“温暖、顾人、会倾听”的那一面定义。',
      strengths: [
        '你是天然的关系黏合剂，善于倾听、安抚与维系联结；',
        '在关怀、协作与陪伴中，你很容易发光；',
        '高女性化得分通常与亲社会行为、关系满意度正相关。'
      ],
      watch: [
        '社会常期待“更顺从”，你可能在需要主张自我时习惯性退后；',
        '你的需求同样重要——温柔不等于把自己放在最后。'
      ],
      suggest: '练习在关键处为自己发声；把“设立边界”也看作一种温柔的自我保护。真正的温柔，是先把自己照顾好，再去温暖别人。',
      research: '高女性化得分与亲社会行为、关系满意度相关；但仅侧重表达性，可能在竞争或主张情境中低估自身力量，平衡更有利。'
    },
    undifferentiated: {
      headline: '你只是还没习惯给自己贴标签',
      definition: '你在两类特质的自我认同都偏中性或偏低。这绝不等于“没有特质”——它更像是一种低自我呈现、或不习惯用这些形容词描述自己的状态。',
      strengths: [
        '你或许本就谦逊低调，不轻易给自己下定论；',
        '未被强烈性别脚本定义，反而意味着更大的可塑空间；',
        '很多人只是“不知道怎么用这些词形容自己”，而非真的缺乏这些品质。'
      ],
      watch: [
        '群体统计上，未分化有时与较低的自我效能、较多的情绪脆弱性相关——但这是“人群趋势”，绝不构成对你的判定；',
        '如果长期感到麻木或提不起劲，请温柔地关照自己的状态，必要时寻求专业支持。'
      ],
      suggest: '不必急着改变。把它当作一个柔软的起点：回想一下，哪些时刻你其实很有力量？哪些时刻你其实很温柔？觉察本身，就已经很有价值。',
      research: '未分化在样本中占比并不低（约三分之一）；它更多提示“可塑性”而非缺陷。性别角色是光谱而非标签，受文化、情境与当下状态影响很大。'
    }
  };

  global.BSRI = {
    MEDIAN_M: MEDIAN_M,
    MEDIAN_F: MEDIAN_F,
    SCALE: SCALE,
    ITEMS: ITEMS,
    TYPES: TYPES,
    REPORT: REPORT,
    score: score
  };
})(window);
