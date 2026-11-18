/* 天壳 / SHELLBREAK — 硅基承续 · 十部位效果通道（2026-11-17 实装）
 * spec docs/VEIL_SI_ORGAN_SPEC_v0.2.md §3（十部位三级全表）+ §7（7 项未解挂点）
 *
 * 为什么要有这个文件：
 *   装器官此前只往 meta.veil.paths.organ 里写等级，**一条效果都没接进生产**——
 *   玩家花飞升点买到的是「数字变了、产能没动」，属于最坏的假功能。SPEC §7 明写
 *   「逐项新造 veil 通道，不动既有字段语义」，所以这里把 30 档效果收成一组**只读访问器**，
 *   各系统在自己的结算点调一个函数，绝不把 organ 等级塞进 s.perk（那是当局字段，
 *   会被 freshRun 清空；器官是跨周目永久的改造）。
 *
 * 两条口径（SPEC §0 已拍）：
 *   · **累加型**（初始人口 +5/+10/+15）按级累加 ⇒ LV3 合计 +30。
 *   · **替换型**（降低食物需求 30/50/70%）取**当前级**的值，不是逐级叠加——
 *     文案写的是「降低 70%」而不是「再降 70%」，叠加会立刻越过 100%。
 *   · 每一条都是**独立乘区**，不并入既有加法轴（craftRatio / buildSave 这类加法轴
 *     一旦被折进去，改一个天赋会顺带改动另一个天赋的实际收益）。
 *   · ⚠️ 星屑 +1%/级 是唯一例外：它按 SPEC §0 #1 与 `breakStardustMul` 的既有先例
 *     **三处叠加**成 +3%/级（鳞 / 眼 / 手 都归一才满额）。
 *
 * 安全纪律：全部读 meta（跨周目），读不到 = 0 级 = 恒等值（1 或 0），
 *   绝不因为存档缺字段而把某条乘区变成 NaN（NaN 会静默污染整条产出链）。
 */
(function (root) {
  'use strict';
  var SB = root.SB || (root.SB = {});
  var VF = {};

  /* 器官等级（0..3）。读 meta.veil.paths.organ，缺任何一层都按 0 处理。 */
  function lv(id) {
    var m = (SB.game && SB.game.meta) ? SB.game.meta() : null;
    var v = m && m.veil;
    var o = v && v.paths && v.paths.organ;
    var n = o ? Number(o[id]) || 0 : 0;
    return n < 0 ? 0 : (n > 3 ? 3 : Math.floor(n));
  }
  /* 替换型档位的取值器：lv 0 → 恒等值；否则取 table[lv]。 */
  function pick(table, n) { return n <= 0 ? table[0] : table[Math.min(n, table.length - 1)]; }
  function anyLv3() { return lv('scale') >= 3 || lv('eye') >= 3 || lv('hand') >= 3; }

  /* ── 鳃 · 潮汐滤膜 ─────────────────────────────────────────────────── */
  /* 初始人口：+5 / +10 / +15 **累加** ⇒ LV3 = +30（SPEC §0 #5：有意强飞升，5 倍于
   * 现行满购 startPop=3；所以开局跳过住房线是设计，别当 bug 修）。 */
  VF.startPop = function () {
    var n = lv('gill'), sum = 0;
    if (n >= 1) sum += 5;
    if (n >= 2) sum += 10;
    if (n >= 3) sum += 15;
    return sum;
  };
  /* 礁口巢（nest）人口上限 +1（SPEC §7-1：popCap 无 nest 独占加值，此处新造）。 */
  VF.nestCapBonus = function () { return lv('gill') >= 3 ? 1 : 0; };

  /* ── 心 · 潮循环泵 ─────────────────────────────────────────────────── */
  /* 工艺效率额外乘区（SPEC §7-2：与 craftRatio 加法轴**相乘**，不并入）。
   * 2026-11-18 用户拍板：三级统一工艺主题 ×1.5 / ×2 / ×2.5（替换型取当前级），
   * 原 LV2/LV3「矿工 / 采石工产出 +200/+300%」作废，不再按岗位加成。 */
  VF.craftExtraMul = function () { return pick([1, 1.5, 2, 2.5], lv('heart')); };
  /* 矿工 / 采石工岗位产出：随 LV2/LV3 改为工艺乘区后**停用**，恒等 1（保留函数避免调用点报错）。 */
  VF.jobOutMul = function () { return 1; };
  /* 星球改造「速度 +100%」按**时间 −50%**（SPEC §0 #3 已拍，LV3 附加项保留）。 */
  VF.terraformTimeMul = function () { return lv('heart') >= 3 ? 0.5 : 1; };

  /* ── 胃 · 藻解釜 ───────────────────────────────────────────────────── */
  /* 食物 / 奢侈品需求、族民诞生间隔：30% / 50% / 70%（替换型，均为额外乘区）。
   * 「族民生产时间」= **人口诞生间隔**（SPEC §0 #4），不是工作节拍。 */
  VF.foodNeedMul = function () { return pick([1, 0.7, 0.5, 0.3], lv('stomach')); };
  VF.luxNeedMul = function () { return pick([1, 0.7, 0.5, 0.3], lv('stomach')); };
  VF.birthTimeMul = function () { return pick([1, 0.7, 0.5, 0.3], lv('stomach')); };

  /* ── 鳞 / 眼 / 手 · 配方与军力 ─────────────────────────────────────── */
  /* 配方工艺效率：精铁/钢/θ 金属按 SPEC 各自一条。走 recipeCraft 加法轴（与科技/政策卡
   * 同源），因为它们本来就是「某个配方 +X%」的语义。 */
  var RECIPE_KEYS = ['craft_iron', 'iron', 'craft_steel', 'steel', 'craft_theta', 'theta', 'thetaMetal'];
  VF.recipeCraft = function (recipeId, outRes) {
    var keys = [recipeId, outRes];
    var add = 0;
    function gain(n) { return n <= 0 ? 0 : pick([0, 0.5, 1, 2], n); }
    if (keys.indexOf('craft_iron') >= 0 || keys.indexOf('iron') >= 0) add += gain(lv('scale'));
    if (keys.indexOf('craft_steel') >= 0 || keys.indexOf('steel') >= 0) add += gain(lv('hand'));
    if (keys.indexOf('craft_theta') >= 0 || keys.indexOf('theta') >= 0 || keys.indexOf('thetaMetal') >= 0) add += gain(lv('eye'));
    return add;
  };
  VF.RECIPE_KEYS = RECIPE_KEYS;
  /* 军人产出军力 +50% / +100% / +200%（鳞 + 手 各一条，两条**相加**后一次性乘）。 */
  VF.soldierPactPct = function () {
    var n = Math.max(lv('scale'), lv('hand'));
    return n <= 0 ? 0 : pick([0, 0.5, 1, 2], n);
  };

  /* ── 星屑：工坊区每级建筑 +1%（鳞 / 眼 / 手 三处叠加，SPEC §0 #1）── */
  VF.starPerBldgPct = function () {
    var n = 0;
    if (lv('scale') >= 3) n += 1;
    if (lv('eye') >= 3) n += 1;
    if (lv('hand') >= 3) n += 1;
    return n;   // 每级建筑 +0/1/2/3 %
  };
  /* 结算星屑乘区：工坊区（workshop）每级建筑 ×(1 + n%)。 */
  VF.breakStardustMul = function (workshopLevels) {
    var pct = VF.starPerBldgPct();
    if (!pct || !(workshopLevels > 0)) return 1;
    return 1 + pct / 100 * workshopLevels;
  };

  /* ── 鳍 · 液压鳍肢 ─────────────────────────────────────────────────── */
  /* 建筑消耗 / 奇观消耗降低（额外乘区，替换型）。 */
  VF.buildSave = function () { return pick([0, 0.2, 0.3, 0.5], lv('fin')); };
  VF.wonderSave = function () { return lv('fin') >= 3 ? 0.3 : 0; };

  /* ── 尾 · 潮轮 ─────────────────────────────────────────────────────── */
  VF.hydroOutMul = function () { return lv('tail') <= 0 ? 1 : 1 + pick([0, 0.5, 1, 1.5], lv('tail')); };
  /* 钻机破壳速度 +200% ⇒ ×3（与被动削壳**两轴隔离**，SPEC §7-5 明写不许合并）。 */
  VF.drillSpeedMul = function () { return lv('tail') >= 3 ? 3 : 1; };

  /* ── 脑 · 共识核 ───────────────────────────────────────────────────── */
  /* 软实力行动消耗 −20/40/60%（乘在既有 cultureCostCut 折扣之后，SPEC §7-6）。 */
  VF.softCostMul = function () { return pick([1, 0.8, 0.6, 0.4], lv('brain')); };
  /* 被动破壳速度 +100% ⇒ ×2（shellDrive 轴，别并进钻机）。 */
  VF.passiveShellMul = function () { return lv('brain') >= 3 ? 2 : 1; };

  /* ── 喉 · 潮声合成器 ───────────────────────────────────────────────── */
  /* 战争行动对敌人规模损失 +50/100/150%（替换型，乘在 warScaleDamage 加法轴之后）。 */
  VF.warScaleDamageMul = function () {
    var n = lv('throat');
    return n <= 0 ? 1 : 1 + pick([0, 0.5, 1, 1.5], n);
  };
  /* 敌国文明规模上限 −20%（与征服者 cap 乘子**相乘**，SPEC §7-7）。 */
  VF.enemyCapMul = function () { return lv('throat') >= 3 ? 0.8 : 1; };

  /* 诊断用：把当前全部通道值摊平，供 UI / e2e 断言（只读）。 */
  VF.snapshot = function () {
    return {
      lv: { gill: lv('gill'), heart: lv('heart'), stomach: lv('stomach'), scale: lv('scale'), fin: lv('fin'),
        tail: lv('tail'), eye: lv('eye'), brain: lv('brain'), throat: lv('throat'), hand: lv('hand') },
      startPop: VF.startPop(), nestCapBonus: VF.nestCapBonus(),
      craftExtraMul: VF.craftExtraMul(), jobOutMul: VF.jobOutMul('miner'),
      terraformTimeMul: VF.terraformTimeMul(),
      foodNeedMul: VF.foodNeedMul(), luxNeedMul: VF.luxNeedMul(), birthTimeMul: VF.birthTimeMul(),
      soldierPactPct: VF.soldierPactPct(), starPerBldgPct: VF.starPerBldgPct(),
      buildSave: VF.buildSave(), wonderSave: VF.wonderSave(),
      hydroOutMul: VF.hydroOutMul(), drillSpeedMul: VF.drillSpeedMul(),
      softCostMul: VF.softCostMul(), passiveShellMul: VF.passiveShellMul(),
      warScaleDamageMul: VF.warScaleDamageMul(), enemyCapMul: VF.enemyCapMul(),
      anyLv3: anyLv3()
    };
  };

  SB.veilFx = VF;
})(typeof window !== 'undefined' ? window : globalThis);
