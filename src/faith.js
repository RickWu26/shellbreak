/* 天壳 / SHELLBREAK — 本周目信仰信条。 */
(function (root) {
  'use strict';
  var SB = root.SB || (root.SB = {});
  var THRESHOLDS = [1, 1000, 1000000, 1000000000];
  var TENETS = [
    { id: 'fertile_rite', category: 'profession', icon: 'assets/faith-tenets/profession/fertile-rite.png', job: 'gather', percent: 20 },
    { id: 'coral_labor', category: 'profession', icon: 'assets/faith-tenets/profession/coral-labor.png', job: 'coralwright', percent: 20 },
    { id: 'stone_circle_rite', category: 'profession', icon: 'assets/faith-tenets/profession/stone-circle-rite.png', job: 'quarrier', percent: 20 },
    { id: 'vein_covenant', category: 'profession', icon: 'assets/faith-tenets/profession/vein-covenant.png', job: 'miner', percent: 20 },
    { id: 'divine_doctrine', category: 'profession', icon: 'assets/faith-tenets/profession/divine-doctrine.png', job: 'scholar', percent: 20 },
    { id: 'scripture_copying', category: 'profession', icon: 'assets/faith-tenets/profession/scripture-copying.png', job: 'scribe', percent: 20 },
    { id: 'tithe_offering', category: 'profession', icon: 'assets/faith-tenets/profession/tithe-offering.png', job: 'merchant', percent: 20 },
    { id: 'workshop_ethic', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/workshop-ethic.png', percentPerTemple: 1 },
    { id: 'nourish_world', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/nourish-world.png', amount: 2 },
    { id: 'sanctuary_protection', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/sanctuary-protection.png', percent: 50 },
    { id: 'scripture_legacy', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/scripture-legacy.png', minutes: 10 },
    { id: 'school_of_revelation', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/school-of-revelation.png', minutes: 10 },
    { id: 'winter_watch', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/winter-watch.png', percent: 20 },
    { id: 'church_alms', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/church-alms.png', percent: 15 },
    { id: 'ancient_covenant', category: 'doctrine', icon: 'assets/faith-tenets/doctrine/ancient-covenant.png', percent: 10 },
    { id: 'shellbreaking_covenant', category: 'industry', icon: 'assets/faith-tenets/industry/shellbreaking-covenant.png', percent: 20 },
    { id: 'furnace_hymn', category: 'industry', icon: 'assets/faith-tenets/industry/furnace-hymn.png', percent: 20 },
    { id: 'furnace_tithe_rule', category: 'industry', icon: 'assets/faith-tenets/industry/furnace-tithe-rule.png', percent: 15 },
    { id: 'iron_altar', category: 'industry', icon: 'assets/faith-tenets/industry/iron-altar.png', percent: 20 },
    { id: 'star_forge_offering', category: 'industry', icon: 'assets/faith-tenets/industry/star-forge-offering.png', percent: 15, minTier: 2 },
    { id: 'turbine_psalm', category: 'industry', icon: 'assets/faith-tenets/industry/turbine-psalm.png', percent: 15 },
    { id: 'artisan_guild', category: 'industry', icon: 'assets/faith-tenets/industry/artisan-guild.png', amount: 1 },
    { id: 'material_exemption', category: 'industry', icon: 'assets/faith-tenets/industry/material-exemption.png', percent: 5 },
    { id: 'scholasticism', category: 'industry', icon: 'assets/faith-tenets/industry/scholasticism.png', percent: 5 },
    { id: 'church_codex', category: 'industry', icon: 'assets/faith-tenets/industry/church-codex.png', percent: 5 },
    { id: 'sacred_monument', category: 'industry', icon: 'assets/faith-tenets/industry/sacred-monument.png', percent: 10 },
    { id: 'faith_guard', category: 'military', icon: 'assets/faith-tenets/military/faith-guard.png', job: 'soldier', percent: 20 },
    { id: 'holy_see_edict', category: 'military', icon: 'assets/faith-tenets/military/holy-see-edict.png', percent: 15 },
    { id: 'expedition_blessing', category: 'military', icon: 'assets/faith-tenets/military/expedition-blessing.png', percent: 10 },
    { id: 'martyr_oath', category: 'military', icon: 'assets/faith-tenets/military/martyr-oath.png', percent: 25 },
    { id: 'triumph_hymn', category: 'military', icon: 'assets/faith-tenets/military/triumph-hymn.png', percent: 10 },
    { id: 'creed_wither', category: 'doctrine', icon: 'assets/faith-tenets/void/creed-wither.png', percent: 100, requiresVoidDomain: 'wither' },
    { id: 'creed_bingkui', category: 'military', icon: 'assets/faith-tenets/void/creed-bingkui.png', percent: 200, requiresVoidDomain: 'warlord' },
    { id: 'creed_duoyang', category: 'profession', icon: 'assets/faith-tenets/void/creed-duoyang.png', percent: 200, requiresVoidDomain: 'pleasure' },
    { id: 'creed_yisou', category: 'industry', icon: 'assets/faith-tenets/void/creed-yisou.png', percent: 200, requiresVoidDomain: 'lore' }
  ];
  var BY_ID = {};
  for (var ti = 0; ti < TENETS.length; ti++) BY_ID[TENETS[ti].id] = TENETS[ti];

  function idOf(id) { return BY_ID[id] ? id : null; }
  /* 无神论挑战（veil_nofaith，2026-11-20）：本挑战局不得装备任何信条。
   * ⚠️ 这是 goal 型（终点研成《掀起帘幕》），active() 在研成后返回 null ⇒ 限制自动解除，
   *    与飞升苦旅同一口径。用 active() 而非 entered()：完成瞬间限制就该撤。 */
  function noFaithActive(s) {
    var a = (s && SB.challenges && SB.challenges.active) ? SB.challenges.active(s) : null;
    return !!(a && a.id === 'veil_nofaith');
  }
  /* 四选一奖励（无神论永久奖励，跨周目）：tierDone≥1 时草稿池由 3 选 1 放宽为 4 选 1。
   * ⚠️ 读 meta 档位而非本局 active —— 这是完成后新局才生效的永久奖励。 */
  function draftOptionCount() {
    var meta = (SB.game && SB.game.meta) ? SB.game.meta() : null;
    var done = (SB.challenges && SB.challenges.tierDone)
      ? SB.challenges.tierDone('veil_nofaith', meta) : 0;
    return done ? 4 : 3;
  }
  function has(s, id) {
    if (noFaithActive(s)) return false;
    return !!(s && s.faithTenets && s.faithTenets.indexOf(id) >= 0);
  }
  function tenetAvailable(s, id) {
    var tenet = BY_ID[id];
    return !!tenet && (!tenet.requiresVoidDomain
      || !!(SB.voidFx && SB.voidFx.domainLv && SB.voidFx.domainLv(tenet.requiresVoidDomain) >= 3));
  }
  function tierForThreshold(threshold) { return THRESHOLDS.indexOf(Number(threshold)); }
  function randomValue() {
    var n = SB.rng ? SB.rng() : Math.random();
    return typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(0.999999999999, n)) : 0;
  }
  function uniqueKnown(ids) {
    var out = [], seen = {}, i, id;
    if (!Array.isArray(ids)) return out;
    for (i = 0; i < ids.length && out.length < THRESHOLDS.length; i++) {
      id = idOf(ids[i]);
      if (id && !seen[id]) { seen[id] = true; out.push(id); }
    }
    return out;
  }
  function offeredElsewhere(s) {
    var out = {}, drafts = s.faithTenetDrafts || [], i, j, d;
    for (i = 0; i < drafts.length; i++) {
      d = drafts[i];
      if (!d || d.chosen) continue;
      for (j = 0; j < (d.options || []).length; j++) out[d.options[j]] = true;
    }
    return out;
  }
  function createDraft(s, threshold) {
    var tier = tierForThreshold(threshold), blocked = {}, pool = [], i, j;
    if (tier < 0) return false;
    for (i = 0; i < (s.faithTenets || []).length; i++) blocked[s.faithTenets[i]] = true;
    var pending = offeredElsewhere(s);
    for (var p in pending) blocked[p] = true;
    for (i = 0; i < TENETS.length; i++) {
      var t = TENETS[i];
      if ((t.minTier || 0) <= tier && !blocked[t.id] && tenetAvailable(s, t.id)) pool.push(t.id);
    }
    for (i = pool.length - 1; i > 0; i--) {
      j = Math.floor(randomValue() * (i + 1));
      var swap = pool[i]; pool[i] = pool[j]; pool[j] = swap;
    }
    s.faithTenetDrafts.push({ threshold: threshold, options: pool.slice(0, draftOptionCount()), chosen: null });
    return true;
  }
  function normalizeDrafts(s) {
    var raw = Array.isArray(s.faithTenetDrafts) ? s.faithTenetDrafts : [];
    var out = [], seenThresholds = {}, i, j, d, threshold, tier, opts, seen, id, chosen;
    for (i = 0; i < raw.length; i++) {
      d = raw[i] || {};
      threshold = Number(d.threshold);
      tier = tierForThreshold(threshold);
      if (tier < 0 || seenThresholds[threshold]) continue;
      seenThresholds[threshold] = true;
      opts = []; seen = {};
      if (Array.isArray(d.options)) for (j = 0; j < d.options.length && opts.length < draftOptionCount(); j++) {
        id = idOf(d.options[j]);
        if (id && (BY_ID[id].minTier || 0) <= tier && !seen[id] && tenetAvailable(s, id)) { seen[id] = true; opts.push(id); }
      }
      chosen = idOf(d.chosen);
      if (!chosen || opts.indexOf(chosen) < 0) chosen = null;
      out.push({ threshold: threshold, options: opts, chosen: chosen });
    }
    out.sort(function (a, b) { return a.threshold - b.threshold; });
    s.faithTenetDrafts = out;
    var selected = uniqueKnown(s.faithTenets);
    for (i = 0; i < out.length; i++) if (out[i].chosen && selected.indexOf(out[i].chosen) < 0 && selected.length < THRESHOLDS.length)
      selected.push(out[i].chosen);
    s.faithTenets = selected;
  }
  function syncRun(s) {
    if (!s) return false;
    var hadEarned = typeof s.faithEarnedTotal === 'number' && isFinite(s.faithEarnedTotal) && s.faithEarnedTotal >= 0;
    var hadTenets = Array.isArray(s.faithTenets);
    var hadDrafts = Array.isArray(s.faithTenetDrafts);
    normalizeDrafts(s);
    var balance = Number(s.res && s.res.faith) || 0;
    var earned = Number(s.faithEarnedTotal);
    if (!(earned >= 0 && isFinite(earned))) earned = 0;
    s.faithEarnedTotal = Math.max(earned, balance);
    var created = false;
    for (var i = 0; i < THRESHOLDS.length; i++) {
      var exists = false;
      for (var j = 0; j < s.faithTenetDrafts.length; j++) if (s.faithTenetDrafts[j].threshold === THRESHOLDS[i]) { exists = true; break; }
      if (!exists && s.faithEarnedTotal >= THRESHOLDS[i]) created = createDraft(s, THRESHOLDS[i]) || created;
    }
    return created || !hadEarned || !hadTenets || !hadDrafts || s.faithEarnedTotal !== earned;
  }
  function recordEarned(s, amount) {
    if (!s || !(amount > 0) || !isFinite(amount)) return false;
    if (!(typeof s.faithEarnedTotal === 'number' && isFinite(s.faithEarnedTotal) && s.faithEarnedTotal >= 0))
      s.faithEarnedTotal = Math.max(0, Number(s.res && s.res.faith) || 0);
    s.faithEarnedTotal += amount;
    if (!Array.isArray(s.faithTenets)) s.faithTenets = [];
    if (!Array.isArray(s.faithTenetDrafts)) s.faithTenetDrafts = [];
    var created = false;
    for (var i = 0; i < THRESHOLDS.length; i++) {
      var exists = false;
      for (var j = 0; j < s.faithTenetDrafts.length; j++) if (s.faithTenetDrafts[j].threshold === THRESHOLDS[i]) { exists = true; break; }
      if (!exists && s.faithEarnedTotal >= THRESHOLDS[i]) created = createDraft(s, THRESHOLDS[i]) || created;
    }
    return created;
  }
  function choose(s, threshold, id) {
    id = idOf(id);
    if (noFaithActive(s)) return false;   /* 无神论挑战：装备入口预防性拦截 */
    if (!s || !id || has(s, id) || !tenetAvailable(s, id)) return false;
    var drafts = s.faithTenetDrafts || [], draft = null;
    for (var i = 0; i < drafts.length; i++) if (drafts[i].threshold === Number(threshold)) { draft = drafts[i]; break; }
    if (!draft || draft.chosen || draft.options.indexOf(id) < 0) return false;
    draft.chosen = id;
    s.faithTenets = uniqueKnown(s.faithTenets || []);
    s.faithTenets.push(id);
    return true;
  }
  function pending(s) {
    var ds = s && s.faithTenetDrafts || [];
    for (var i = 0; i < ds.length; i++) if (ds[i] && !ds[i].chosen) return true;
    return false;
  }
  function nextThreshold(s) {
    var total = Math.max(0, Number(s && s.faithEarnedTotal) || 0);
    for (var i = 0; i < THRESHOLDS.length; i++) if (total < THRESHOLDS[i]) return THRESHOLDS[i];
    return null;
  }
  function thresholdForTenet(s, id) {
    var ds = s && s.faithTenetDrafts || [];
    for (var i = 0; i < ds.length; i++) if (ds[i] && ds[i].chosen === id) return ds[i].threshold;
    return null;
  }
  function params(id) {
    var t = BY_ID[id] || {};
    return { percent: t.percent === undefined ? t.percentPerTemple : t.percent,
      amount: t.amount, minutes: t.minutes };
  }
  function text(key, vars) { return SB.i18n && SB.i18n.t ? SB.i18n.t(key, vars) : ''; }
  function tenetName(id) { return idOf(id) ? text('faith.tenet.' + id + '.name') : ''; }
  function tenetEffect(id) { return idOf(id) ? text('faith.tenet.' + id + '.effect', params(id)) : ''; }
  function awardMinutes(s, id) {
    if (!has(s, id) || !SB.economy || !SB.economy.faithRate || !SB.economyInternals || !SB.economyInternals.addRes) return 0;
    var seconds = (BY_ID[id].minutes || 0) * 60;
    var amount = SB.economy.faithRate(s) * seconds;
    if (amount > 0) SB.economyInternals.addRes(s, 'faith', amount);
    return amount;
  }
  function professionOutputMul(s, job) {
    for (var i = 0; i < TENETS.length; i++) {
      var t = TENETS[i];
      if (t.job === job && has(s, t.id)) return 1 + (t.percent || 0) / 100;
    }
    return 1;
  }
  function percentMul(s, id) { return has(s, id) ? 1 + (BY_ID[id].percent || 0) / 100 : 1; }
  function creedMul(s, id) { return tenetAvailable(s, id) ? percentMul(s, id) : 1; }
  function saveMul(s, id) { return has(s, id) ? 1 - (BY_ID[id].percent || 0) / 100 : 1; }
  function workshopEthicAdd(s) {
    return has(s, 'workshop_ethic') ? Math.max(0, (s && s.lvl && s.lvl.temple) || 0) * (BY_ID.workshop_ethic.percentPerTemple || 0) / 100 : 0;
  }
  function popCapBonus(s) { return has(s, 'nourish_world') ? (BY_ID.nourish_world.amount || 0) : 0; }
  function warmstoneUseMul(s) {
    return has(s, 'winter_watch') && SB.economy && SB.economy.isCold && SB.economy.isCold(s)
      && s.techs && s.techs.thermal ? saveMul(s, 'winter_watch') : 1;
  }
  function militaryActionCostMul(s, actionType) {
    if (!has(s, 'expedition_blessing')) return 1;
    return actionType === 'raid' || actionType === 'invasion' || actionType === 'war'
      || actionType === 'total-war' || actionType === 'totalWar' ? saveMul(s, 'expedition_blessing') : 1;
  }
  function refundFailedMilitaryAction(s, spent) {
    return has(s, 'martyr_oath') ? Math.max(0, Number(spent) || 0) * (BY_ID.martyr_oath.percent || 0) / 100 : 0;
  }
  function triumphScaleReduction(s, currentScale) {
    return has(s, 'triumph_hymn') ? Math.max(0, Number(currentScale) || 0) * (BY_ID.triumph_hymn.percent || 0) / 100 : 0;
  }
  function awardOnTechnology(s) { return awardMinutes(s, 'school_of_revelation'); }
  function awardOnCivic(s) { return awardMinutes(s, 'scripture_legacy'); }

  SB.faith = {
    thresholds: THRESHOLDS.slice(), tenets: TENETS,
    byId: function (id) { return idOf(id) ? BY_ID[id] : null; },
    tenetAvailable: tenetAvailable,
    has: has, syncRun: syncRun, recordEarned: recordEarned, choose: choose, hasPending: pending,
    nextThreshold: nextThreshold, thresholdForTenet: thresholdForTenet, text: text,
    tenetName: tenetName, tenetEffect: tenetEffect, params: params,
    awardOnTechnology: awardOnTechnology, awardOnCivic: awardOnCivic,
    professionOutputMul: professionOutputMul, workshopEthicAdd: workshopEthicAdd,
    popCapBonus: popCapBonus, faithOutputMul: function (s) { return percentMul(s, 'sanctuary_protection'); },
    warmstoneUseMul: warmstoneUseMul, luxuryUseMul: function (s) { return saveMul(s, 'church_alms'); },
    shellDrillSpeedMul: function (s) { return percentMul(s, 'shellbreaking_covenant'); },
    furnaceIronOutputMul: function (s) { return percentMul(s, 'furnace_hymn'); },
    furnaceMetalUseMul: function (s) { return saveMul(s, 'furnace_tithe_rule'); },
    steelOutputMul: function (s) { return percentMul(s, 'iron_altar'); },
    thetaOutputMul: function (s) { return percentMul(s, 'star_forge_offering'); },
    turbineOutputMul: function (s) { return percentMul(s, 'turbine_psalm'); },
    autoCraftSlots: function (s) { return has(s, 'artisan_guild') ? (BY_ID.artisan_guild.amount || 0) : 0; },
    buildingCostMul: function (s) { return saveMul(s, 'material_exemption'); },
    techCostMul: function (s) { return saveMul(s, 'scholasticism'); },
    civicCostMul: function (s) { return saveMul(s, 'church_codex'); },
    wonderCostMul: function (s) { return saveMul(s, 'sacred_monument'); },
    militaryOutputMul: function (s) { return percentMul(s, 'faith_guard'); },
    creedStarMul: function (s) { return creedMul(s, 'creed_wither'); },
    creedMilitaryMul: function (s) { return creedMul(s, 'creed_bingkui'); },
    creedScribeCultureMul: function (s) { return creedMul(s, 'creed_duoyang'); },
    creedScholarSciMul: function (s) { return creedMul(s, 'creed_yisou'); },
    scaleCapFaithCostMul: function (s) { return saveMul(s, 'holy_see_edict'); },
    militaryActionCostMul: militaryActionCostMul,
    failedMilitaryRefund: refundFailedMilitaryAction,
    successfulWarScaleReduction: triumphScaleReduction
  };
})(typeof window !== 'undefined' ? window : globalThis);
