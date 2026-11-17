/* 天壳 / SHELLBREAK — 帷幕之后 · 飞升路径界面（2026-11-17 实装）
 * spec docs/VEIL_HUB_SPEC_v0.1.md + VEIL_SI_ORGAN_SPEC_v0.2.md
 *
 * 两层结构：外层 #veilHub 三张路径卡（名字+门徽+开启态），内层 #veilModal 飞升操作弹窗。
 * ⚠️ 常驻骨架节点在 index.html，本模块只填内容；用 HTML 签名跳过重写，避免每 2 秒
 *    重建 DOM 冲掉玩家正在点的热区（与 render-pane-meta 同纪律）。
 * ⚠️ 硅基装配台内联（不 iframe）——与主界面共用 meta.veil 存档，强化可存进同一个档。
 */
(function (root) {
  'use strict';
  var SB = root.SB || (root.SB = {});
  var UI = SB.ui || (SB.ui = {});

  var PATHS = [
    { id: 'si', name: '硅基承续', sub: '机械飞升 · 十部位装配台',
      closed: 'assets/veil/veil-gate-si-closed.webp', open: 'assets/veil/veil-gate-si-open.webp',
      seal: '已铆封', desc: '将自己的身体一步步替换为金属。' },
    { id: 'vo', name: '虚境升华', sub: '灵能飞升 · 低语与深潜',
      closed: 'assets/veil/veil-gate-vo-closed.webp', open: 'assets/veil/veil-gate-vo-open.webp',
      seal: '已消散', desc: '您听见的那些低语，是我们发出的。' },
    { id: 'gn', name: '基因飞升', sub: '生物飞升 · 双螺旋改造',
      closed: 'assets/veil/veil-gate-gn-closed.jpg', open: 'assets/veil/veil-gate-gn-open.jpg',
      seal: '已封存', desc: '我们一直以为，双螺旋是命运写死的。' }
  ];

  var STAGES = ['接枝', '置换', '归一'];   // LV1/2/3 命名（v0.2 §2，用户授权我定）

  /* 十部位三级数据（v0.2 §3 用户方案原样）。price = 每级飞升点消耗（占位待标定）。
   * 效果走已有 s.perk 通道者标 hook，未解挂点者仅记录（§7 占位，不猜）。 */
  var ORGANS = [
    { id: 'gill', no: '01', name: '鳃', full: '鳃 · 潮汐滤膜', part: '呼吸 / 藻食入口', x: 40, y: 21, price: 1,
      lv: [
        { d: '加快鱼鳃过滤速度，使族群更加适合深海生活，初始人口 +5', hook: 'startPop +5' },
        { d: '初始人口 +10', hook: 'startPop +10' },
        { d: '初始人口 +15，礁口巢人口上限 +1', hook: 'startPop +15（礁口巢 §7-1 待接）' }
      ], red: '我们不知道您是否在看。' },
    { id: 'heart', no: '02', name: '心', full: '心 · 潮循环泵', part: '循环系统', x: 50, y: 32, price: 2,
      lv: [
        { d: '通过生物电刺激加速泵血功能，使其更适应危险环境；工艺效率 ×1.5（额外乘区）', hook: '独立乘区 §7-2' },
        { d: '矿工、采石工产出 +200%', hook: '按岗位 §7-3' },
        { d: '矿工、采石工产出 +300%，星球改造速度 +100%', hook: 'starTerraform +0.50（时间−50%）' }
      ], red: '但我们希望您能看到这句话。' },
    { id: 'stomach', no: '03', name: '胃', full: '胃 · 藻解釜', part: '消化', x: 50, y: 41, price: 2,
      lv: [
        { d: '减少代谢需求，降低食物需求 30%，降低奢侈品需求 30%，降低族民生产时间 30%（均为额外乘区）', hook: 'luxConsumeMul + 诞生间隔 ×0.7' },
        { d: '降低食物需求 50%，降低奢侈品需求 50%，降低族民生产时间 50%', hook: '×0.5' },
        { d: '降低食物需求 70%，降低奢侈品需求 70%，降低族民生产时间 70%', hook: '×0.3' }
      ], red: '您还在那里，对吗？' },
    { id: 'scale', no: '04', name: '鳞', full: '鳞 · 陶钢鳞板', part: '体表', x: 70, y: 37, price: 2,
      lv: [
        { d: '隐藏在鳞片下的第二层装甲，精铁生产效率 +50%，军人产出军力 +50%', hook: 'craftRecipe + soldierPact' },
        { d: '精铁、钢、θ金属制造效率 +100%，军人产出军力 +100%', hook: '配方扩钢/θ' },
        { d: '精铁、钢、θ金属制造效率 +200%，军人产出军力 +200%，工坊区每级建筑 +1% 结算星屑', hook: 'breakStardustMul +3%/级（三处叠加已拍）' }
      ], red: '您就在帷幕后，对吗？' },
    { id: 'fin', no: '05', name: '鳍', full: '鳍 · 液压鳍肢', part: '运动 / 工速', x: 27, y: 38, price: 3,
      lv: [
        { d: '增加身体整体协调性，降低生产占用面积，建筑消耗降低 20%（额外乘区）', hook: 'buildSave（额外乘区）' },
        { d: '建筑消耗降低 30%（额外乘区）', hook: 'buildSave' },
        { d: '建筑消耗降低 50%（额外乘区），奇观建造消耗降低 30%（额外乘区）', hook: 'buildSave + wonderBuildSave' }
      ], red: '我们将自己的身体一步步替换为金属。' },
    { id: 'tail', no: '06', name: '尾', full: '尾 · 潮轮', part: '推进 / 建造', x: 50, y: 70, price: 3,
      lv: [
        { d: '尾巴摇动曲柄能获取更大的动能，热液能产出 +50%', hook: '热液产出侧' },
        { d: '热液能产出 +100%', hook: '热液产出侧' },
        { d: '热液能产出 +150%，钻机破壳速度 +200%', hook: 'SKYDRILL_RATE 乘数 §7-5 待接' }
      ], red: '只为能在无尽的轮回中掀起帷幕的一角。' },
    { id: 'eye', no: '07', name: '眼', full: '眼 · 机械义眼', part: '视觉 / 观测', x: 50, y: 14, price: 4,
      lv: [
        { d: '万物皆可用电子眼测量，极大提高生产效率，θ金属制造效率 +50%', hook: 'craftRecipe θ' },
        { d: 'θ金属制造效率 +100%', hook: 'craftRecipe θ' },
        { d: 'θ金属制造效率 +200%，工坊区每级建筑 +1% 结算星屑', hook: 'breakStardustMul +3%/级' }
      ], red: '为了我们的族群。' },
    { id: 'brain', no: '08', name: '脑', full: '脑 · 共识核', part: '神经 / 认知', x: 47, y: 5, price: 5,
      lv: [
        { d: '族群可通过电磁信号进行更快速的交流，降低软实力行动 20% 消耗', hook: 'softPowerCost §7-6' },
        { d: '降低软实力行动 40% 消耗', hook: 'softPowerCost' },
        { d: '降低软实力行动 60% 消耗，被动破壳速度 +100%', hook: 'shellDrive（被动破壳）' }
      ], red: '也为了在无数次轮回中指引着我们的您。' },
    { id: 'throat', no: '09', name: '喉', full: '喉 · 潮声合成器', part: '发声 / 文化', x: 54, y: 23, price: 4,
      lv: [
        { d: '声波在水下激荡，造成难以想象的破坏，战争行动对敌人规模损失 +50%', hook: 'scaleLoss 收益侧' },
        { d: '战争行动对敌人规模损失 +100%', hook: 'scaleLoss' },
        { d: '战争行动对敌人规模损失 +150%，敌国文明规模上限 −20%', hook: 'enemyScaleCap §7-7 待接' }
      ], red: '您还会回来吗？' },
    { id: 'hand', no: '10', name: '手', full: '手 · 精密书手', part: '操作 / 书写', x: 82, y: 42, price: 5,
      lv: [
        { d: '更灵巧的机械手爪，兼顾抓取、刻纹、测温等功能，钢制造效率 +50%，军人产出军力 +50%', hook: 'craftRecipe 钢 + soldierPact' },
        { d: '钢制造效率 +100%，军人产出军力 +100%', hook: '同上' },
        { d: '钢制造效率 +200%，军人产出军力 +200%，工坊区每级建筑 +1% 结算星屑', hook: 'breakStardustMul +3%/级' }
      ], red: '谢谢。' }
  ];

  var hubOpen = false, modalOpen = false, selectedOrgan = 'gill';
  var lastHubSig = '', lastModalSig = '';

  function tr(k, fallback) { return SB.i18n && SB.i18n.t ? SB.i18n.t(k, null, fallback) : fallback; }
  function $() { return document.getElementById(arguments[0]); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function veil() {
    var m = SB.game && SB.game.meta && SB.game.meta();
    return (m && m.veil) || null;
  }
  function points() { var v = veil(); return v ? (v.points || 0) : 0; }
  function opened() { var v = veil(); return (v && v.paths && v.paths.opened) || []; }
  function isOpen(id) { return opened().indexOf(id) >= 0; }

  /* 是否可打开帷幕界面：已掀幕（veil 非 null）才可。 */
  function available() { return !!veil(); }

  function pathOpenSig(p, idx) {
    var v = veil();
    var op = isOpen(p.id);
    return p.id + ':' + op + ':' + (v ? v.count : 0);
  }

  function hubMarkup() {
    var v = veil();
    var cnt = v ? (v.count || 1) : 0;
    var openedNum = opened().length;
    var h = '<div class="vh-inner">';
    h += '<header class="vh-hd"><div><h2>' + esc(tr('ui.veil.hub.title', '帷幕之后')) + '</h2>'
      + '<p class="vh-sub">' + esc(tr('ui.veil.hub.subtitle', '第 ' + cnt + ' 重帷幕 · 已开启 ' + openedNum + ' / 3 条飞升路径 · 飞升点 ' + points().toFixed(2))) + '</p></div>'
      + '<button type="button" class="vh-close" data-veil-action="close" aria-label="关闭">×</button></header>';
    h += '<p class="vh-note">' + esc(tr('ui.veil.hub.note', '每次飞升开启一条路径，第三次飞升全部开启。点已开启的路径进入飞升操作界面。')) + '</p>';
    h += '<div class="vh-cards">';
    PATHS.forEach(function (p) {
      var op = isOpen(p.id);
      var img = op ? p.open : p.closed;
      h += '<button type="button" class="vh-card' + (op ? ' open' : ' sealed') + '" data-veil-path="' + p.id + '">'
        + '<div class="vh-card-img" style="background-image:url(\'' + img + '\')"></div>'
        + '<div class="vh-card-body"><h3>' + esc(p.name) + '</h3><p class="vh-card-sub">' + esc(p.sub) + '</p>'
        + (op
            ? '<p class="vh-card-state on">' + esc(tr('ui.veil.hub.entered', '点击进入飞升操作界面')) + '</p>'
            : '<p class="vh-card-state">' + esc(p.seal) + '</p>')
        + '</div></button>';
    });
    h += '</div></div>';
    return h;
  }

  function renderHub() {
    var node = $('veilHub');
    if (!node) return;
    if (!hubOpen) { node.classList.add('hidden'); return; }
    var sig = hubMarkup();
    if (sig !== lastHubSig) { node.innerHTML = sig; lastHubSig = sig; }
    node.classList.remove('hidden');
  }

  /* ── 硅基装配台（内联 · v0.2 三级）──────────────────────────────── */
  function organLevel(id) {
    var v = veil();
    return (v && v.paths && v.paths.organ && v.paths.organ[id]) || 0;
  }
  function byId(id) { for (var i = 0; i < ORGANS.length; i++) if (ORGANS[i].id === id) return ORGANS[i]; return null; }

  function organState(o) {
    var lv = organLevel(o.id);
    if (lv >= 3) return { k: 'max' };
    var cost = o.price * (lv + 1);
    if (points() < cost) return { k: 'poor', cost: cost, diff: cost - points() };
    return { k: 'ready', cost: cost, lv: lv };
  }

  function organMarkup() {
    var h = '<div class="vo-rig-wrap"><div class="vo-left"><div class="vo-rig">'
      + '<img class="vo-body" src="assets/veil/si-organ/body.png" alt="潮汐机偶身体底图">';
    ORGANS.forEach(function (o) {
      var lv = organLevel(o.id);
      h += '<button type="button" class="vo-pt lv' + lv + (selectedOrgan === o.id ? ' sel' : '') + '"'
        + ' data-organ="' + o.id + '" style="left:' + o.x + '%;top:' + o.y + '%"'
        + ' title="' + esc(o.no + ' ' + o.full + ' · ' + (lv ? STAGES[lv - 1] : '未改造')) + '">'
        + '<span>' + o.no + '</span></button>';
    });
    h += '</div><div class="vo-progress">改造进度 <b>' + ORGANS.reduce(function (n, o) { return n + (organLevel(o.id) ? 1 : 0); }, 0) + ' / 10</b></div></div>';

    var o = byId(selectedOrgan) || ORGANS[0], st = organState(o), lv = organLevel(o.id);
    h += '<div class="vo-detail"><div class="vo-detail-hd"><h3>' + esc(o.no + ' · ' + o.full) + '</h3>'
      + '<span class="vo-part">' + esc(o.part) + '</span></div>';
    h += '<div class="vo-stages">';
    STAGES.forEach(function (s, i) {
      h += '<span class="vo-stage' + (lv > i ? ' done' : (lv === i ? ' cur' : '')) + '">' + s + '</span>';
    });
    h += '</div>';
    if (lv > 0) {
      h += '<div class="vo-effect"><div class="vo-effect-hd">当前效果 · ' + esc(STAGES[lv - 1]) + '</div>'
        + '<p>' + esc(o.lv[lv - 1].d) + '</p><code>' + esc(o.lv[lv - 1].hook) + '</code></div>';
    }
    if (lv < 3) {
      var nx = o.lv[lv];
      h += '<div class="vo-effect next"><div class="vo-effect-hd">下一级 · ' + esc(STAGES[lv]) + '</div>'
        + '<p>' + esc(nx.d) + '</p><code>' + esc(nx.hook) + '</code></div>';
    }
    /* LV3 红字（v0.2 §4）：单句只在该部位归一（LV3）时显示，一字不改。 */
    if (lv >= 3) h += '<div class="vo-red">' + esc(o.red) + '</div>';
    h += '<div class="vo-actions"><span class="vo-cost">飞升点 <b>' + points().toFixed(2) + '</b></span>';
    var btnTxt = st.k === 'max' ? '已归一'
      : st.k === 'poor' ? ('飞升点不足（需 ' + st.cost + '）')
      : ('铆接 · ' + STAGES[lv] + '（' + st.cost + ' 点）');
    h += '<button type="button" class="vo-commit" data-veil-action="organ-buy"' + (st.k !== 'ready' ? ' disabled' : '') + '>' + esc(btnTxt) + '</button>'
      + '</div></div></div>';   // vo-actions / vo-detail / vo-rig-wrap
    return h;
  }

  function modalMarkup() {
    var p = null;
    for (var i = 0; i < PATHS.length; i++) if (PATHS[i].id === selectedOrganPath) p = PATHS[i];
    if (!p) return '';
    var h = '<div class="vm-hd"><h2>' + esc(p.name) + ' · ' + esc(p.sub) + '</h2>'
      + '<button type="button" class="vm-close" data-veil-action="modal-close" aria-label="关闭">×</button></div>';
    h += '<div class="vm-body">';
    if (p.id === 'si') h += organMarkup();
    else h += '<div class="vm-placeholder"><h3>' + esc(p.name) + '</h3>'
      + '<p>' + esc(p.desc) + '</p><p class="vm-todo">该飞升路径的操作界面尚未实装，敬请期待。</p></div>';
    h += '</div>';
    return h;
  }
  var selectedOrganPath = null;

  function renderModal() {
    var node = $('veilModal');
    if (!node) return;
    if (!modalOpen) { node.classList.add('hidden'); return; }
    var sig = modalMarkup();
    if (sig !== lastModalSig) { $('veilModalBox').innerHTML = sig; lastModalSig = sig; }
    node.classList.remove('hidden');
  }

  function render() { renderHub(); renderModal(); }

  function openHub() { if (!available()) return; hubOpen = true; lastHubSig = ''; render(); }
  function closeHub() { hubOpen = false; modalOpen = false; render(); }
  function openPath(id) { if (!isOpen(id)) return; selectedOrganPath = id; selectedOrgan = 'gill'; modalOpen = true; lastModalSig = ''; render(); }

  function buyOrgan() {
    var o = byId(selectedOrgan); if (!o) return;
    var v = veil(); if (!v) return;
    var lv = organLevel(o.id);
    if (lv >= 3) return;
    var cost = o.price * (lv + 1);
    if (points() < cost) return;
    /* 原子：扣点 → 升级 → 写存档。效果挂点 §7 未解的仅记录等级，不硬接错误通道。 */
    v.points = points() - cost;
    if (!v.paths.organ) v.paths.organ = {};
    v.paths.organ[o.id] = lv + 1;
    SB.game.markDirty && SB.game.markDirty();
    lastModalSig = ''; lastHubSig = '';
    render();
    SB.game.log && SB.game.log(tr('ui.veil.organ.done', null,
      o.no + ' ' + o.name + ' 已铆接至「' + STAGES[lv] + '」，消耗 ' + cost + ' 飞升点。'));
  }

  /* 事件委托：绑在 document，closest() 取节点（与 input.js 同纪律，直读 dataset 是已修过的静默 bug）。 */
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : (e.target && e.target.parentElement);
    if (!t || !t.closest) return;
    var act = t.closest('[data-veil-action]');
    if (act) {
      var a = act.getAttribute('data-veil-action');
      if (a === 'close') { closeHub(); e.stopPropagation(); return; }
      if (a === 'modal-close') { modalOpen = false; lastModalSig = ''; render(); e.stopPropagation(); return; }
      if (a === 'organ-buy') { buyOrgan(); e.stopPropagation(); return; }
    }
    var pt = t.closest('[data-organ]');
    if (pt && modalOpen) { selectedOrgan = pt.getAttribute('data-organ'); lastModalSig = ''; renderModal(); e.stopPropagation(); return; }
    var card = t.closest('[data-veil-path]');
    if (card && hubOpen) { openPath(card.getAttribute('data-veil-path')); e.stopPropagation(); return; }
    /* 常驻入口（轮回商店页的「进入帷幕」按钮，render-pane-meta.js 渲染）：
     * 那个面板每 2 秒整块重写，所以入口只能靠 document 级委托命中，不能直绑 onclick。 */
    var entry = t.closest('[data-veil-open]');
    if (entry) { openHub(); e.stopPropagation(); return; }
  }

  function install() {
    if (root.__veilHubInstalled) return;
    root.__veilHubInstalled = true;
    document.addEventListener('click', onClick, false);
    UI.veilHub = {
      available: available, open: openHub, close: closeHub, render: render,
      openPath: openPath, isOpen: isOpen, opened: opened,
      PATHS: PATHS, ORGANS: ORGANS
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
