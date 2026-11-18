/* 天壳 / SHELLBREAK — 帷幕之后 · 飞升路径页（2026-11-17 实装）
 * spec docs/VEIL_HUB_SPEC_v0.1.md + VEIL_SI_ORGAN_SPEC_v0.2.md
 *
 * ⚠️ 2026-11-17 晚形态变更（用户拍板）：原先 #veilHub 是 fixed 全屏遮罩弹窗，
 *    现在改成**独立页签**「帷幕」—— 点页签切到 #pane-veil，不是弹窗那种。
 *    随之删掉 #veilHub / #veilModal 两个遮罩层：内容由 render.js 的 PANES.veil
 *    写进 #pane-veil，与其它页走同一条「签名跳过重写」路径（不再自己管 DOM）。
 *
 * 页内两视图：
 *   hub  —— 三张飞升路径卡（名字 + 门徽 + 开启态），无树、无节点、无进度条；
 *   path —— 某条已开启路径的操作界面（硅基 = 十部位装配台），带「← 返回帷幕」。
 * ⚠️ 视图状态只在模块变量里、不进存档：页签本身才是入口，重开游戏回大厅是对的。
 * ⚠️ 装配台内联（不 iframe）——与主界面共用 meta.veil 存档，强化能存进同一个档。
 *
 * ⚠️ 2026-11-17 二次变更：装配台补上「部位大图」+ 坐标对齐底图。
 *    body.png 上美术已烘焙十个编号圈（描边纯色：青 #65E2CE / 紫粉 #C08CF0，
 *    直径 65px @900 宽），而原先的 x/y 是凭空写的，与圈心差 5~7.5%：
 *    44px 的数字圆点盖不住 29px 的彩圈，偏出去就成了「两层圈打架」。
 *    现坐标按纯色描边聚类精确对齐（每圈 n=744 像素、65×65 bbox，误差 <0.5px），
 *    十个圈心正好落在整数百分比上（美术按整数网格画的）。
 *    部位图 assets/veil/si-organ/organ-NN-*.webp 放进详情面板，132px。
 */
(function (root) {
  'use strict';
  var SB = root.SB || (root.SB = {});
  var UI = SB.ui || (SB.ui = {});

  /* wip = 操作界面尚未实装：卡片常驻锁定态、标「开发中」，即便飞升已开启该路径也不放入。
   * focus = 卡片上的一句话定位（用户 2026-11-18 指定：工业与制造 / 科技与市政 / 采集与生产）。 */
  var PATHS = [
    { id: 'si', name: '硅基承续', focus: '工业与制造',
      closed: 'assets/veil/veil-gate-si-closed.webp', open: 'assets/veil/veil-gate-si-open.webp',
      seal: '已铆封', desc: '将自己的身体一步步替换为金属。' },
    { id: 'vo', name: '虚境升华', focus: '科技与市政', wip: true,
      closed: 'assets/veil/veil-gate-vo-closed.webp', open: 'assets/veil/veil-gate-vo-open.webp',
      seal: '已消散', desc: '您听见的那些低语，是我们发出的。' },
    { id: 'gn', name: '生命织章', focus: '采集与生产', wip: true,
      closed: 'assets/veil/veil-gate-gn-closed.jpg', open: 'assets/veil/veil-gate-gn-open.jpg',
      seal: '已封存', desc: '我们一直以为，双螺旋是命运写死的。' }
  ];

  var STAGES = ['接枝', '置换', '归一'];   // LV1/2/3 命名（v0.2 §2，用户授权我定）

  /* 飞升点价目表：每一级固定 1 / 2 / 4（2026-11-17 用户拍板）。
   * ⚠️ 唯一真源 —— organState 与 buyOrgan 都走 lvCost()，别再各自写公式。
   *    旧实现是 `price × (lv+1)`（每部位一个基准价 1~5），三级成本散成 1/2/3 ~ 5/10/15，
   *    部位间梯度靠 price 拉，读起来乱且不成曲线；现统一成 ×2 递增。
   *    单部位全套 = 1+2+4 = 7，十部位全归一 = 70 点（旧口径 186 点）。 */
  var LV_COST = [1, 2, 4];
  function lvCost(lv) { return LV_COST[lv] || 0; }

  /* 十部位三级数据（v0.2 §3 用户方案原样）。
   * 飞升点消耗统一由 LV_COST 决定（1/2/4），部位之间不再有价格差。
   * hook 标注该档实际乘区落点；30 档全部已接（见 VEIL_SI_ORGAN_SPEC §7.1）。 */
  var ORGANS = [
    { id: 'gill', no: '01', name: '鳃', full: '鳃 · 潮汐滤膜', part: '呼吸 / 藻食入口', x: 36, y: 27, img: 'assets/veil/si-organ/organ-01-gill.webp',
      lv: [
        { d: '加快鱼鳃过滤速度，使族群更加适合深海生活，初始人口 +5', hook: 'startPop +5' },
        { d: '初始人口 +10', hook: 'startPop +10' },
        { d: '初始人口 +15，礁口巢人口上限 +1', hook: 'startPop +15 + nestCap +1' }
      ], red: '我们不知道您是否在看。' },
    { id: 'heart', no: '02', name: '心', full: '心 · 潮循环泵', part: '循环系统', x: 50, y: 38, img: 'assets/veil/si-organ/organ-02-heart.webp',
      lv: [
        { d: '通过生物电刺激加速泵血功能，使其更适应危险环境；工艺效率 ×1.5（额外乘区）', hook: 'craftExtraMul（独立乘区）' },
        { d: '工艺效率 ×2（额外乘区）', hook: 'craftExtraMul（独立乘区）' },
        { d: '工艺效率 ×2.5（额外乘区），星球改造速度 +100%', hook: 'craftExtraMul + terraformTimeMul（时间−50%）' }
      ], red: '但我们希望您能看到这句话。' },
    { id: 'stomach', no: '03', name: '胃', full: '胃 · 藻解釜', part: '消化', x: 50, y: 48, img: 'assets/veil/si-organ/organ-03-stomach.webp',
      lv: [
        { d: '减少代谢需求，降低食物需求 30%，降低奢侈品需求 30%，降低族民生产时间 30%（均为额外乘区）', hook: 'foodUse / luxDemandMul / 诞生间隔 ×0.7' },
        { d: '降低食物需求 50%，降低奢侈品需求 50%，降低族民生产时间 50%', hook: '×0.5' },
        { d: '降低食物需求 70%，降低奢侈品需求 70%，降低族民生产时间 70%', hook: '×0.3' }
      ], red: '您还在那里，对吗？' },
    { id: 'scale', no: '04', name: '鳞', full: '鳞 · 陶钢鳞板', part: '体表', x: 70, y: 37, img: 'assets/veil/si-organ/organ-04-scale.webp',
      lv: [
        { d: '隐藏在鳞片下的第二层装甲，精铁生产效率 +50%，军人产出军力 +50%', hook: 'recipeCraft 精铁 + soldierPact' },
        { d: '精铁、钢、θ金属制造效率 +100%，军人产出军力 +100%', hook: 'recipeCraft 扩钢/θ' },
        { d: '精铁、钢、θ金属制造效率 +200%，军人产出军力 +200%，工坊区每级建筑 +1% 结算星屑', hook: 'breakStardustMul +1%/级（三处叠加）' }
      ], red: '您就在帷幕后，对吗？' },
    { id: 'fin', no: '05', name: '鳍', full: '鳍 · 液压鳍肢', part: '运动 / 工速', x: 27, y: 38, img: 'assets/veil/si-organ/organ-05-fin.webp',
      lv: [
        { d: '增加身体整体协调性，降低生产占用面积，建筑消耗降低 20%（额外乘区）', hook: 'buildSave（独立乘区）' },
        { d: '建筑消耗降低 30%（额外乘区）', hook: 'buildSave' },
        { d: '建筑消耗降低 50%（额外乘区），奇观建造消耗降低 30%（额外乘区）', hook: 'buildSave + wonderSave' }
      ], red: '我们将自己的身体一步步替换为金属。' },
    { id: 'tail', no: '06', name: '尾', full: '尾 · 潮轮', part: '推进 / 建造', x: 50, y: 70, img: 'assets/veil/si-organ/organ-06-tail.webp',
      lv: [
        { d: '尾巴摇动曲柄能获取更大的动能，热液能产出 +50%', hook: 'hydroAlloc 供给侧（全六源）' },
        { d: '热液能产出 +100%', hook: 'hydroAlloc 供给侧（全六源）' },
        { d: '热液能产出 +150%，钻机破壳速度 +200%', hook: 'hydroAlloc 供给 ×2.5 + SKYDRILL_RATE ×3（两轴隔离）' }
      ], red: '只为能在无尽的轮回中掀起帷幕的一角。' },
    { id: 'eye', no: '07', name: '眼', full: '眼 · 机械义眼', part: '视觉 / 观测', x: 54, y: 16, img: 'assets/veil/si-organ/organ-07-eye.webp',
      lv: [
        { d: '万物皆可用电子眼测量，极大提高生产效率，θ金属制造效率 +50%', hook: 'recipeCraft θ' },
        { d: 'θ金属制造效率 +100%', hook: 'recipeCraft θ' },
        { d: 'θ金属制造效率 +200%，工坊区每级建筑 +1% 结算星屑', hook: 'breakStardustMul +1%/级' }
      ], red: '为了我们的族群。' },
    { id: 'brain', no: '08', name: '脑', full: '脑 · 共识核', part: '神经 / 认知', x: 47, y: 6, img: 'assets/veil/si-organ/organ-08-brain.webp',
      lv: [
        { d: '族群可通过电磁信号进行更快速的交流，降低软实力行动 20% 消耗', hook: 'softPowerCost' },
        { d: '降低软实力行动 40% 消耗', hook: 'softPowerCost' },
        { d: '降低软实力行动 60% 消耗，被动破壳速度 +100%', hook: 'softPowerCost + shellDrive（被动削壳）' }
      ], red: '也为了在无数次轮回中指引着我们的您。' },
    { id: 'throat', no: '09', name: '喉', full: '喉 · 潮声合成器', part: '发声 / 文化', x: 54, y: 27, img: 'assets/veil/si-organ/organ-09-throat.webp',
      lv: [
        { d: '声波在水下激荡，造成难以想象的破坏，战争行动对敌人规模损失 +50%', hook: 'scaleLoss 收益侧' },
        { d: '战争行动对敌人规模损失 +100%', hook: 'scaleLoss' },
        { d: '战争行动对敌人规模损失 +150%，敌国文明规模上限 −20%', hook: 'scaleLoss + enemyCapMul' }
      ], red: '您还会回来吗？' },
    { id: 'hand', no: '10', name: '手', full: '手 · 精密书手', part: '操作 / 书写', x: 80, y: 47, img: 'assets/veil/si-organ/organ-10-hand.webp',
      lv: [
        { d: '更灵巧的机械手爪，兼顾抓取、刻纹、测温等功能，钢制造效率 +50%，军人产出军力 +50%', hook: 'recipeCraft 钢 + soldierPact' },
        { d: '钢制造效率 +100%，军人产出军力 +100%', hook: '同上' },
        { d: '钢制造效率 +200%，军人产出军力 +200%，工坊区每级建筑 +1% 结算星屑', hook: 'breakStardustMul +1%/级' }
      ], red: '谢谢。' }
  ];

  /* view：'hub' = 三张路径卡；其余值为已开启的路径 id = 该路径的操作界面。 */
  var view = 'hub', selectedOrgan = 'gill';

  function tr(k, fallback) { return SB.i18n && SB.i18n.t ? SB.i18n.t(k, null, fallback) : fallback; }
  /* 带插值的词条（{count}/{opened}）：与 render.js 的 tr(key, params, fallback) 同序。 */
  function trp(k, params, fallback) {
    var v = SB.i18n && SB.i18n.t ? SB.i18n.t(k, params) : '';
    if (v) return v;
    return String(fallback == null ? '' : fallback).replace(/\{([^{}]+)\}/g, function (mm, name) {
      return params && params[name] != null ? String(params[name]) : mm;
    });
  }
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

  /* 页签是否可以进：已掀幕（veil 非 null）才可。render.js 的页签灰态与 game.js 的
   * setTab 门都读这一个判据，不各自另写一份。 */
  function available() { return !!veil(); }

  /* ── 视图一：三张路径卡（帷幕主界面）────────────────────────────── */
  function hubMarkup() {
    var v = veil();
    var cnt = v ? (v.count || 1) : 0;
    var openedNum = opened().length;
    var h = '<div class="vh-inner">';
    h += '<header class="vh-hd"><div><h2>' + esc(tr('ui.veil.hub.title', '帷幕之后')) + '</h2>'
      + '<p class="vh-sub">' + esc(trp('ui.veil.hub.meta_line', { count: cnt, opened: openedNum },
          '第 ' + cnt + ' 重帷幕 · 已开启 ' + openedNum + ' / 3 条飞升路径')) + '</p></div>'
      /* 页签形态之后不再需要关闭按钮（页签本身就是导航），原位改为飞升点余额。 */
      + '<div class="vh-points"><span>' + esc(tr('ui.veil.hub.points_balance', '飞升点')) + '</span>'
      + '<b>' + points().toFixed(2) + '</b></div></header>';
    h += '<p class="vh-note">' + esc(tr('ui.veil.hub.note', '每次飞升开启一条路径，第三次飞升全部开启。点已开启的路径进入飞升操作界面。')) + '</p>';
    h += '<div class="vh-cards">';
    PATHS.forEach(function (p) {
      var op = isOpen(p.id);
      var enterable = op && !p.wip;                 // wip 路径即使已开启也不放行
      var img = op ? p.open : p.closed;             // 门徽仍反映飞升进度（确实开了这条路径）
      var state = p.wip
        ? '<p class="vh-card-state wip">' + esc(tr('ui.veil.hub.wip', '开发中 · 敬请期待')) + '</p>'
        : (op
            ? '<p class="vh-card-state on">' + esc(tr('ui.veil.hub.entered', '点击进入飞升操作界面')) + '</p>'
            : '<p class="vh-card-state">' + esc(p.seal) + '</p>');
      h += '<button type="button" class="vh-card' + (enterable ? ' open' : (p.wip ? ' wip' : ' sealed')) + '"'
        + ' data-veil-path="' + p.id + '"' + (enterable ? '' : ' disabled') + '>'
        + '<div class="vh-card-img" style="background-image:url(\'' + img + '\')"></div>'
        + '<div class="vh-card-body"><h3>' + esc(p.name) + '</h3>'
        + '<p class="vh-card-focus">' + esc(tr('ui.veil.hub.focus.' + p.id, p.focus)) + '</p>'
        + state
        + '</div></button>';
    });
    h += '</div></div>';
    return h;
  }

  /* ── 视图二：某条路径的操作界面 ────────────────────────────────── */
  function organLevel(id) {
    var v = veil();
    return (v && v.paths && v.paths.organ && v.paths.organ[id]) || 0;
  }
  function byId(id) { for (var i = 0; i < ORGANS.length; i++) if (ORGANS[i].id === id) return ORGANS[i]; return null; }
  function pathById(id) { for (var i = 0; i < PATHS.length; i++) if (PATHS[i].id === id) return PATHS[i]; return null; }

  function organState(o) {
    var lv = organLevel(o.id);
    if (lv >= 3) return { k: 'max' };
    var cost = lvCost(lv);
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
        + '<span class="pi" style="background-image:url(' + o.img + ')"></span>'
        + '<span class="pn">' + o.no + '</span></button>';
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
    /* 三级效果**全部展开**（2026-11-17 用户要求：后面等级也要能看，不能锁住）。
     * 第一级与部位大图同排，其余整行；三种状态：
     *   i <  lv → 「· 已达成」   实线
     *   i === lv → 「· 当前 · 需 N 点」 虚线（next）
     *   i >  lv → 「· 未接枝 · 需 N 点」 虚线 + 淡态（dim，内容一字不少）
     * 价目直接写在卡头，玩家不必点下去才知道下一级多少钱。
     * 部位图 = assets/veil/si-organ/organ-NN-*.webp（512² 原图，132px 显示）。
     * ⚠️ 用 background-image 而不是 <img>：面板每 2 秒可能整块重写，<img> 会闪，背景图走缓存。 */
    var cards = '';
    for (var ci = 0; ci < 3; ci++) {
      var L = o.lv[ci];
      var cls = ci < lv ? '' : (ci === lv ? ' next' : ' dim');
      var tag = ci < lv ? ' · 已达成'
        : (ci === lv ? ' · 当前 · 需 ' + lvCost(ci) + ' 点' : ' · 未接枝 · 需 ' + lvCost(ci) + ' 点');
      var one = '<div class="vo-effect' + cls + '"><div class="vo-effect-hd">' + esc(STAGES[ci] + tag) + '</div>'
        + '<p>' + esc(L.d) + '</p></div>';
      if (ci === 0) {
        cards += '<div class="vo-art-row">'
          + '<div class="org-fig" style="background-image:url(\'' + o.img + '\')" title="' + esc(o.full) + '"></div>'
          + '<div class="vo-art-col">' + one + '</div></div>';
      } else {
        cards += one;
      }
    }
    h += cards;
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

  function pathMarkup(p) {
    var h = '<div class="vm-box"><div class="vm-hd">'
      + '<button type="button" class="vm-back" data-veil-action="back">← ' + esc(tr('ui.veil.hub.back', '返回帷幕')) + '</button>'
      + '<h2>' + esc(p.name) + '</h2></div>';
    h += '<div class="vm-body">';
    if (p.id === 'si') h += organMarkup();
    else h += '<div class="vm-placeholder"><h3>' + esc(p.name) + '</h3>'
      + '<p>' + esc(p.desc) + '</p><p class="vm-todo">该飞升路径的操作界面尚未实装，敬请期待。</p></div>';
    h += '</div></div>';
    return h;
  }

  /* render.js 的 PANES.veil 调这个：只回 HTML，不碰 DOM（写盘与重绘由 render 统一管）。 */
  function markup() {
    var p = view !== 'hub' ? pathById(view) : null;
    /* 视图指向的路径若已不存在/未开启（读档、掀幕重置），退回大厅，免得渲染空白。 */
    if (view !== 'hub' && (!p || !isOpen(p.id) || p.wip)) { view = 'hub'; p = null; }
    return p ? pathMarkup(p) : hubMarkup();
  }

  /* 重绘：直接走 renderPanes —— 与其它页同一个入口（签名没变时它本身会跳过重写）。 */
  function repaint() { if (SB.ui.render && SB.ui.render.renderPanes) SB.ui.render.renderPanes(); }

  /* open() 保留原名（game.js 掀幕成功后调用）：现在等价于「切到帷幕页签」。 */
  function open() {
    if (!available()) return;
    view = 'hub';
    if (SB.game && SB.game.setTab) SB.game.setTab('veil');
    else repaint();
  }
  function openPath(id) {
    if (!isOpen(id)) return;
    var p = pathById(id);
    if (p && p.wip) return;                  // 开发中的路径禁止进入（卡片也常驻 disabled）
    view = id;
    selectedOrgan = 'gill';
    repaint();
  }
  function back() { view = 'hub'; repaint(); }
  /* 切走页签时回大厅：下次点「帷幕」总是先看到三条路径，而不是上次停留的装配台。 */
  function leave() { if (view !== 'hub') view = 'hub'; }

  function buyOrgan() {
    var o = byId(selectedOrgan); if (!o) return;
    var v = veil(); if (!v) return;
    var lv = organLevel(o.id);
    if (lv >= 3) return;
    var cost = lvCost(lv);
    if (points() < cost) return;
    /* 原子：扣点 → 升级 → 立刻落盘。
     * ⚠️ 必须显式 saveMeta：meta 没有「每 tick 自动存」的通道（旧版这里只有 markDirty，
     *    买完器官直接关游戏，飞升点就白花了 —— 花的是跨周目货币，这笔不能靠运气）。 */
    v.points = points() - cost;
    if (!v.paths.organ) v.paths.organ = {};
    v.paths.organ[o.id] = lv + 1;
    var m = SB.game && SB.game.meta && SB.game.meta();
    if (m && SB.state && SB.state.saveMeta) SB.state.saveMeta(m);
    SB.game.markDirty && SB.game.markDirty();
    repaint();
    SB.game.log && SB.game.log(tr('ui.veil.organ.done', null,
      o.no + ' ' + o.name + ' 已铆接至「' + STAGES[lv] + '」，消耗 ' + cost + ' 飞升点。'));
  }

  /* 事件委托：绑在 document（pane 每 2 秒可能整块重写，直绑 onclick 会失效）。 */
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : (e.target && e.target.parentElement);
    if (!t || !t.closest) return;
    var act = t.closest('[data-veil-action]');
    if (act) {
      var a = act.getAttribute('data-veil-action');
      if (a === 'back') { back(); e.stopPropagation(); return; }
      if (a === 'organ-buy') { buyOrgan(); e.stopPropagation(); return; }
    }
    var pt = t.closest('[data-organ]');
    if (pt && view !== 'hub') { selectedOrgan = pt.getAttribute('data-organ'); repaint(); e.stopPropagation(); return; }
    var card = t.closest('[data-veil-path]');
    if (card && view === 'hub') { openPath(card.getAttribute('data-veil-path')); e.stopPropagation(); return; }
  }

  function install() {
    if (root.__veilHubInstalled) return;
    root.__veilHubInstalled = true;
    document.addEventListener('click', onClick, false);
    UI.veilHub = {
      available: available, open: open, openPath: openPath, back: back, leave: leave,
      markup: markup, render: repaint,
      isOpen: isOpen, opened: opened, view: function () { return view; },
      PATHS: PATHS, ORGANS: ORGANS
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
