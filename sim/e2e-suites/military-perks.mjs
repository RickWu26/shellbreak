/* e2e suite: 军事 / 文化轮回点节点（2026-11-14 用户拍板）
 *
 * 四组三级链：军契（军人军力产出 10/20/30%）、破阵（对敌国规模损耗 10/20/30%）、
 * 胜算（战争行动成功几率 3/6/10pp）、文教节流（传播文化市政点消耗 −10/20/30%）。
 *
 * 钉住的事故类型：
 *   ① 节点有定义但 apply 键漏进 emptyPerks ⇒ 死 perk；
 *   ② 军契只改 rate() 没改 powerParts() ⇒ 顶栏详情「分项之和 ≠ 净值」；
 *   ③ 军契乘进 folk.effJobs 或军校项 ⇒ 全岗位串味 / 量纲不一致；
 *   ④ 胜算只加 success ⇒ 归一化后成功率只 +2.73pp、大成功几率反降；
 *   ⑤ 破阵误做独立乘区或动 effectiveMaxScale ⇒ 侵占征服者挑战轴；
 *   ⑥ 文教节流误作用于 faith 分支或 cultureReduction 幅度 ⇒ 口径串味；
 *   ⑦ 第 9 树漏登记 META_TREES ⇒ 16 个节点买了也不显示。
 *
 * 第三批追加「折冲之训」三级链、双前置军机之位与无限节点「军通汇」，见文末 ⑧⑨。
 *
 * ⚠️ 不 mock SB：夹具只改 meta.perks 账本，一律走 freshRun / war 生产函数 /
 *    paneMeta 真实渲染；临时字段都在 try/finally 还原，套件挂全量最尾部。
 */
import { readFileSync } from 'node:fs';

export function run({ SB, check, noop }) {
  console.log('\n=== 军事/文化轮回点节点（枕戈待旦 + 文教节流）===');

  const meta = SB.game.meta();
  const def = id => (SB.TIDE_TREE || []).filter(p => p.id === id)[0];
  const chains = [
    { key: 'soldierPact', sub: 'military', costs: [2, 5, 8], vals: [1, 1, 1],
      ids: ['soldierPact1', 'soldierPact2', 'soldierPact3'] },
    { key: 'warScaleDamage', sub: 'military', costs: [3, 6, 12], vals: [0.10, 0.10, 0.10],
      ids: ['warScaleDamage1', 'warScaleDamage2', 'warScaleDamage3'] },
    { key: 'warSuccessOdds', sub: 'military', costs: [4, 8, 15], vals: [0.03, 0.03, 0.04],
      ids: ['warSuccessOdds1', 'warSuccessOdds2', 'warSuccessOdds3'] },
    { key: 'cultureCostCut', sub: 'politics', costs: [3, 6, 9], vals: [0.10, 0.10, 0.10],
      ids: ['cultureCostCut1', 'cultureCostCut2', 'cultureCostCut3'] }
  ];
  const ALL = chains.reduce((a, c) => a.concat(c.ids), []);
  const allOn = {};
  ALL.forEach(id => { allOn[id] = 1; });

  function freshWith(perks) {
    const keep = meta.perks;
    meta.perks = perks;
    try { return SB.state.freshRun(false); }
    finally { meta.perks = keep; }
  }
  function warFixture(s) {
    s.techs.navigation = true;
    Object.assign(s.civics, {
      military_training: true, professional_army: true, mobilization: true,
      drama: true, sovereign: true, trade: true
    });
    SB.war.syncCampaign(s);
    return s;
  }
  const sumParts = parts => parts.reduce((a, p) => a + p.v, 0);
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  /* ① 数据层：四组三级链的结构 / 前置 / 分组 / 价格 / apply 拍板值 */
  check('四组三级链共 12 节点：分组、层级、链式前置、价格与 apply 数值一致',
    chains.every(c => c.ids.every((id, i) => {
      const p = def(id);
      return !!p && p.subtree === c.sub && p.layer === i + 1 && p.cost === c.costs[i] &&
        !!p.apply && p.apply[c.key] === c.vals[i] && !p.n &&
        (i === 0 ? !p.nest : p.nest === c.ids[i - 1]);
    })),
    ALL.map(id => { const p = def(id); return p ? id + '@' + p.subtree + '/L' + p.layer : id + '=MISSING'; }).join(' '));
  const empty = SB.state.emptyPerks();
  check('4 个新 apply 键都在 emptyPerks 白名单内（不靠读档兜底）',
    chains.every(c => Object.prototype.hasOwnProperty.call(empty, c.key) && empty[c.key] === 0),
    chains.map(c => c.key + '=' + empty[c.key]).join(' '));

  /* ② 派生：freshRun 是唯一落点，累加口径与生产一致 */
  const s0 = freshWith({}), s3 = freshWith(allOn);
  check('freshRun 未点亮：四条新轴全 0',
    chains.every(c => (s0.perk[c.key] || 0) === 0), '');
  check('freshRun 全点亮：soldierPact=3 级 / warScaleDamage=0.30 / warSuccessOdds=0.10 / cultureCostCut=0.30',
    near(s3.perk.soldierPact, 3) && near(s3.perk.warScaleDamage, 0.30) &&
    near(s3.perk.warSuccessOdds, 0.10) && near(s3.perk.cultureCostCut, 0.30),
    JSON.stringify({ sp: s3.perk.soldierPact, sd: s3.perk.warScaleDamage,
      so: s3.perk.warSuccessOdds, cc: s3.perk.cultureCostCut }));

  /* ③ 军契：rate() 与 powerParts() 同步，且只放大士兵那一项 */
  [s0, s3].forEach(s => { s.pop = 10; s.jobs.soldier = 10; s.lvl.barracks = 2; s.lvl.military_academy = 1; });
  const r0 = SB.war.rate(s0), p0 = SB.war.powerParts(s0);
  const r3 = SB.war.rate(s3), p3 = SB.war.powerParts(s3);
  check('未点亮：军力 rate=5.2 且 powerParts 分项之和 === 净值',
    near(r0, 5.2) && near(sumParts(p0), r0) && p0.length === 2,
    'rate=' + r0 + ' sum=' + sumParts(p0) + ' parts=' + p0.length);
  check('军契三级：rate 与 powerParts 同步，分项之和仍 === 净值',
    r3 > r0 && near(sumParts(p3), r3) && p3.length === 2,
    'rate=' + r3 + ' sum=' + sumParts(p3));
  check('军契只乘士兵项：soldier 分项 ×1.30，军校分项数值不变',
    near(p3[0].v, p0[0].v * 1.30) && near(p3[1].v, p0[1].v),
    'soldier ' + p0[0].v + '→' + p3[0].v + ' / academy ' + p0[1].v + '→' + p3[1].v);

  /* ④ 胜算：从 failure 挪到 success，total 恒 1、大成功不变 */
  const actions = [['raid', 0.70], ['invasion', 0.60], ['totalWar', 0.55]];
  const oddsOK = actions.every(pair => {
    const a = SB.war.actionProbabilities(s0, pair[0]), b = SB.war.actionProbabilities(s3, pair[0]);
    return near(a.success, pair[1]) && near(b.success, pair[1] + 0.10) &&
      near(a.failure + a.success + a.greatSuccess, 1) &&
      near(b.failure + b.success + b.greatSuccess, 1) &&
      near(b.greatSuccess, a.greatSuccess);
  });
  check('胜算三级：三行动成功率精确 +10pp、概率总和恒 1、大成功几率不变',
    oddsOK, actions.map(pair => pair[0] + ':' +
      SB.war.actionProbabilities(s0, pair[0]).success + '→' +
      SB.war.actionProbabilities(s3, pair[0]).success).join(' '));

  /* ⑤ 文教节流：只降 culture 分支的市政点成本，faith 分支不动 */
  const c0 = warFixture(freshWith({})), c3 = warFixture(freshWith(allOn));
  const e0 = SB.war.currentEnemy(c0), e3 = SB.war.currentEnemy(c3);
  const cost0 = SB.war.softPowerCost(c0, e0, 'culture');
  const cost3 = SB.war.softPowerCost(c3, e3, 'culture');
  const faith0 = SB.war.softPowerCost(c0, e0, 'faith');
  const faith3 = SB.war.softPowerCost(c3, e3, 'faith');
  check('文教节流三级：传播文化成本 1000 → 700（−30%），传道信仰成本不变',
    near(cost0, 1000) && near(cost3, 700) && near(faith0, faith3),
    'culture ' + cost0 + '→' + cost3 + ' / faith ' + faith0 + '→' + faith3);
  check('破阵不侵占行动成本与敌国规模上限（征服者挑战轴未被合并）',
    near(SB.war.actionCost(c0, e0, 'raid'), SB.war.actionCost(c3, e3, 'raid')) &&
    near(SB.war.effectiveMaxScale(e0), SB.war.effectiveMaxScale(e3)),
    'cost ' + SB.war.actionCost(c0, e0, 'raid') + '/' + SB.war.actionCost(c3, e3, 'raid') +
    ' cap ' + SB.war.effectiveMaxScale(e0) + '/' + SB.war.effectiveMaxScale(e3));

  /* ⑥ 破阵：真实 executeAction 的 scaleLoss ×1.30（与工坊加算） */
  const oldMarkDirty = SB.game.markDirty;
  SB.game.markDirty = noop;
  try {
    const a0 = warFixture(freshWith({})), a3 = warFixture(freshWith(allOn));
    [a0, a3].forEach(s => { s.jobs.gather = 1; s.res.kelp = 0; s.war.power = 1000; });
    const act0 = SB.war.executeAction(a0, 'enemy_1', 'raid', { random: () => 0.5 });
    const act3 = SB.war.executeAction(a3, 'enemy_1', 'raid', { random: () => 0.5 });
    check('破阵三级：成功行动的敌国规模损耗 ×1.30（两次同为 success）',
      act0.ok && act3.ok && act0.outcome === 'success' && act3.outcome === 'success' &&
      near(act3.scaleLoss, act0.scaleLoss * 1.30),
      'scaleLoss ' + act0.scaleLoss + '→' + act3.scaleLoss +
      ' / outcomes ' + act0.outcome + ',' + act3.outcome);
  } finally { SB.game.markDirty = oldMarkDirty; }

  /* ⑦ 上屏：第 9 树 + 12 个节点都出现在轮回商店真实渲染里 */
  const keepPerks = meta.perks;
  let html = '';
  try { meta.perks = allOn; html = SB.ui.render.paneMeta(); }
  finally { meta.perks = keepPerks; }
  check('轮回商店渲染出第 9 树「枕戈待旦」与 9 个军事节点',
    html.indexOf('枕戈待旦') >= 0 &&
    chains.slice(0, 3).every(c => c.ids.every(id => html.indexOf('data-perk="' + id + '"') >= 0)),
    'tree=' + (html.indexOf('枕戈待旦') >= 0) + ' htmlLen=' + html.length);
  check('文教节流三节点也在「政经往来」组上屏',
    chains[3].ids.every(id => html.indexOf('data-perk="' + id + '"') >= 0), '');

  /* ── ⑧ 第二/三批（2026-11-14）：减损链 + 军事槽 + 军通汇 ───────────────
   * 钉住的事故类型：
   *   ① 前置节点不存在 ⇒ 下游永久「等待前置」；
   *   ② 潮线壁垒只改结算不改面板 ⇒ 倒计时与真实结算分叉；
   *   ③ 战场回收叠乘到挑战 lootYieldMul 或把成功档也打折；
   *   ④ 军机之位替换掉《军事训练》自带的军事槽，或串进工坊自动槽；
   *   ⑤ 双前置写成单个 nest ⇒ 少点亮一半也能买；
   *   ⑥ 无限节点漏 scale/n/subtree ⇒ 轮回共鸣（starInfinite）不放大。 */
  const EXTRA = [
    { id: 'warVeteran1', layer: 1, cost: 2, key: 'warPopLoss', val: 0.10, reqs: [] },
    { id: 'warVeteran2', layer: 2, cost: 5, key: 'warPopLoss', val: 0.10, reqs: ['warVeteran1'] },
    { id: 'warVeteran3', layer: 3, cost: 8, key: 'warPopLoss', val: 0.10, reqs: ['warVeteran2'] },
    { id: 'warSalvage', layer: 3, cost: 40, key: 'warSalvage', val: 0.50, reqs: ['warVeteran2'] },
    { id: 'warBulwark', layer: 3, cost: 15, key: 'warThreat', val: 0.20, reqs: ['warSuccessOdds2'] },
    { id: 'slotMil', layer: 4, cost: 75, key: 'slotMil', val: 1,
      reqs: ['warVeteran3', 'warSuccessOdds3'] },
    { id: 'soldierPactTail', layer: 4, cost: 10, key: 'soldierPact', val: 0.5,
      reqs: ['soldierPact3'], infinite: true }
  ];
  const extraOn = {};
  EXTRA.forEach(e => { extraOn[e.id] = 1; });
  check('减损链/军事槽/军通汇 7 节点：层级、价格、apply 与前置数组一致',
    EXTRA.every(e => {
      const p = def(e.id);
      if (!p || p.subtree !== 'military' || p.layer !== e.layer || p.cost !== e.cost ||
          !p.apply || p.apply[e.key] !== e.val) return false;
      if (e.infinite) { if (p.n !== Infinity || p.scale !== 1.5) return false; }
      else if (p.n) return false;
      const reqs = SB.prestige.perkPrerequisites(p);
      return reqs.length === e.reqs.length && e.reqs.every(id => reqs.indexOf(id) >= 0);
    }), EXTRA.map(e => { const p = def(e.id); return p ? e.id + '@L' + p.layer : e.id + '=MISSING'; }).join(' '));
  check('7 节点的所有前置 id 都真实存在（否则节点永久锁死）',
    EXTRA.every(e => e.reqs.every(id => !!def(id))), '');
  check('4 个新 apply 键都在 emptyPerks 白名单（slotMil 是计数键，别当倍率）',
    EXTRA.every(e => Object.prototype.hasOwnProperty.call(empty, e.key) && empty[e.key] === 0),
    EXTRA.map(e => e.key + '=' + empty[e.key]).join(' '));

  const x0 = freshWith({}), x1 = freshWith(extraOn);
  check('freshRun 全点亮：折冲之训三级 warPopLoss=0.30 / warSalvage=0.50 / warThreat=0.20 / slotMil=1 / 军通汇 +0.5 级',
    near(x1.perk.warPopLoss, 0.30) && near(x1.perk.warSalvage, 0.50) &&
    near(x1.perk.warThreat, 0.20) && near(x1.perk.slotMil, 1) &&
    near(x1.perk.soldierPact, 0.5) && EXTRA.every(e => near(x0.perk[e.key], 0)),
    JSON.stringify({ loss: x1.perk.warPopLoss, salvage: x1.perk.warSalvage,
      threat: x1.perk.warThreat, slot: x1.perk.slotMil, tail: x1.perk.soldierPact }));

  /* 潮线壁垒：精确 0.5 → 0.4；静态判据剥注释后数「三处调用都走同一函数」。 */
  const tr0 = SB.war.threatRateOf(x0, 500, 1000), tr1 = SB.war.threatRateOf(x1, 500, 1000);
  const warSrc = readFileSync('src/war.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const callSites = (warSrc.match(/var threatRate = threatRateOf\(s,/g) || []).length;
  check('潮线壁垒：威胁速率 0.5 → 0.4（−20%），面板/警告/结算三处全走同一函数',
    near(tr0, 0.5) && near(tr1, 0.4) && callSites === 3,
    'rate ' + tr0 + '→' + tr1 + ' / callsites=' + callSites);

  /* 战场回收 + 折冲之训三级：真实 executeAction 的失败结算（只改 meta 账本，不 mock SB） */
  const oldMD = SB.game.markDirty;
  SB.game.markDirty = noop;
  try {
    const mk = perks => {
      const s = warFixture(freshWith(perks));
      s.pop = 1000; s.jobs.soldier = 0; s.jobs.gather = 1; s.res.kelp = 0; s.war.power = 1000;
      return s;
    };
    const f0 = SB.war.executeAction(mk({}), 'enemy_1', 'raid', { random: () => 0.01 });
    const f1 = SB.war.executeAction(mk(extraOn), 'enemy_1', 'raid', { random: () => 0.01 });
    check('战场回收：战败战利品速率 0 → 正数（默认态零变更，成功档不受影响）',
      f0.ok && f1.ok && f0.outcome === 'failure' && f1.outcome === 'failure' &&
      near(f0.resourceRate, 0) && f1.resourceRate > 0,
      'rate ' + f0.resourceRate + '→' + f1.resourceRate +
      ' / loot ' + f0.lootAmount + '→' + f1.lootAmount);
    check('折冲之训三级：raid 失败人口损失 40 → 28（1000 人 × 4% × 0.7）',
      f0.popLost === 40 && f1.popLost === 28,
      'popLost ' + f0.popLost + '→' + f1.popLost);
  } finally { SB.game.markDirty = oldMD; }

  /* 军机之位：只加 1 个军事槽，《军事训练》自带那个不被替换 */
  const g0 = warFixture(freshWith({})), g1 = warFixture(freshWith(extraOn));
  g0.gov = 'tribe'; g1.gov = 'tribe';
  const mil0 = SB.civic.slotList(g0).filter(v => v.type === 'military').length;
  const mil1 = SB.civic.slotList(g1).filter(v => v.type === 'military').length;
  const milCard = (SB.POLICIES || []).filter(p => p.type === 'military')[0];
  check('军机之位：军事槽 1 → 2（叠加不替换），军事卡仍只进对口槽',
    mil0 === 1 && mil1 === 2 && !!milCard &&
    SB.civic.cardFits(milCard, 'military') && !SB.civic.cardFits(milCard, 'prod'),
    'military slots ' + mil0 + '→' + mil1);

  /* ⑨ 第三批结构：双前置锁定、无限节点几何涨价与轮回共鸣放大 */
  const kp2 = meta.perks;
  try {
    meta.perks = { warVeteran3: 1 };
    const half = SB.prestige.perkState('slotMil');
    meta.perks = { warVeteran3: 1, warSuccessOdds3: 1 };
    const both = SB.prestige.perkState('slotMil');
    check('军机之位双前置：只点亮折冲之训 III 仍锁死，两个都点亮才解锁',
      half.locked === true && both.locked === false && both.prerequisites.length === 2,
      'half=' + half.locked + ' both=' + both.locked + ' reqs=' + both.prerequisites.join(','));
  } finally { meta.perks = kp2; }

  const tailDef = def('soldierPactTail');
  check('军通汇具备轮回共鸣放大条件（subtree + n=∞），且全树无限节点都不漏 subtree',
    !!tailDef.subtree && tailDef.n === Infinity &&
    (SB.TIDE_TREE || []).filter(p => p.n === Infinity).every(p => !!p.subtree), '');
  const kp3 = meta.perks, keepStar = meta.starPerks;
  let tailNext = -1, tailBase = -1, tailBoosted = -1;
  try {
    meta.perks = { soldierPact3: 1, soldierPactTail: 2 };
    tailNext = SB.prestige.perkState('soldierPactTail').next;
    tailBase = freshWith({ soldierPact3: 1, soldierPactTail: 2 }).perk.soldierPact;
    meta.starPerks = Object.assign({}, meta.starPerks, { starInfinite: 1 });
    tailBoosted = freshWith({ soldierPact3: 1, soldierPactTail: 2 }).perk.soldierPact;
  } finally { meta.perks = kp3; meta.starPerks = keepStar; }
  check('军通汇：几何涨价 10→15→22（lv2），2 级 +1 军人级；轮回共鸣翻倍成 +2 级',
    tailNext === 22 && near(tailBase, 2) && near(tailBoosted, 3),
    'next@lv2=' + tailNext + ' base=' + tailBase + ' boosted=' + tailBoosted);

  /* 上屏：7 个节点都出现在第 9 树的真实渲染里 */
  const kp = meta.perks;
  let html2 = '';
  try { meta.perks = Object.assign({}, allOn, extraOn); html2 = SB.ui.render.paneMeta(); }
  finally { meta.perks = kp; }
  check('减损链 / 军事槽 / 军通汇 7 节点在轮回商店真实渲染里上屏',
    EXTRA.every(e => html2.indexOf('data-perk="' + e.id + '"') >= 0),
    'htmlLen=' + html2.length);
}
