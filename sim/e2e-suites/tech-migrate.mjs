/* e2e suite: 科技读档迁移不应把当前存活 id 误迁走，也不该白送带门禁的节点。
 *
 * 根因一（2026-11-12 客户反馈「攻城学研究过、重新进又提示要研究」）：
 *   LEGACY_MAP 里 `siegeT: 'skydrill'` 把现纪元三存活节点「攻城学」(id=siegeT) 在每次读档时
 *   改写成「天穹钻机」(skydrill)，导致攻城学读回来变未研究、页签红点复燃、玩家重复研究。
 * 修复：state-migrate.js 在套 legacy 前先建 `_curTechIds`，当前存活 id 直过、不再被迁。
 *
 * 根因二（2026-11-14 客户反馈「天穹钻机凭空已掌握、尤里卡门禁失效」）：
 *   LEGACY_MAP 里 `pick: 'skydrill'`（旧纪元五「工程兵团」）把旧 id 折算成 skydrill ——
 *   一个 reqs=['abyssgeo','shellgeo'] + cond 两座奇观 + 15 万科技点的关键节点。
 *   读档迁移只写 `techs[nid]=true`、不跑 canStudy ⇒ 一次绕过四道门；metOf 第一档
 *   「已掌握即铁证」再把非法状态合法化，全链路无反向纠错。
 * 修复：① 删除 pick/dive 映射；② legacy 映射目标带门禁一律丢弃；③ 读档末尾
 *   按「奇观型尤里卡是否达成」清洗存量脏档。
 *
 * 本套件锁：
 *   ① 研究攻城学 → 读档 round-trip 后 siegeT 仍在、skydrill 不被误点亮；
 *   ② 攻城学 + 天穹钻机 可同存（合法已掌握档不被清洗误杀）；
 *   ③ 已删除的旧 id（pick / dive）一律丢弃、不点亮 skydrill；
 *   ④ 彻底删除的旧 id（ignition/heat）被丢弃、不污染运行状态；
 *   ⑤ 已研究天穹钻机的当前玩家（奇观齐全）不受影响；
 *   ⑥ 存量脏档（techs.skydrill 但两座奇观没建）读档后被清洗；
 *   ⑦ legacy 守卫：临时把任意旧 id 映射到 skydrill 也会被丢弃。
 */
export function run({ SB, check }) {
  console.log('\n=== Tech migrate (攻城学重复研究回归锁) ===');

  const mig = SB.state.migrateRun;

  // 防御：确认 siegeT / skydrill 都是当前存活科技 id（假设本身成立，否则本锁无意义）
  const curIds = (SB.TECHS || []).map(t => t.id);
  check('前提：siegeT(攻城学) 与 skydrill(天穹钻机) 均为当前存活科技 id',
    curIds.includes('siegeT') && curIds.includes('skydrill'),
    JSON.stringify({ siegeT: curIds.includes('siegeT'), skydrill: curIds.includes('skydrill') }));

  // ① 研究攻城学 → 读档后 siegeT 仍在、skydrill 不被误点亮
  {
    const m = mig({ techs: { siegeT: true } });
    check('① 研究攻城学读档后 siegeT 仍为真、skydrill 不被误点亮',
      m.techs.siegeT === true && m.techs.skydrill !== true,
      JSON.stringify({ siegeT: !!m.techs.siegeT, skydrill: !!m.techs.skydrill }));
  }

  // ② 攻城学 + 天穹钻机 可同存（不再互斥）
  // ⚠️ 夹具口径必须与生产写入路径一致：skydrill 的 cond 是「建成两座奇观」，
  //    正常研究过的存档必然带着它们；缺了会被读档末尾的合法性校验判成脏档清掉。
  {
    const m = mig({ era: 5, techs: { siegeT: true, skydrill: true },
      wonders: { wonder_shellcutter: true, wonder_presspipe: true } });
    check('② 攻城学 + 天穹钻机 可同存（合法已掌握档不被清洗误杀）',
      m.techs.siegeT === true && m.techs.skydrill === true,
      JSON.stringify({ siegeT: !!m.techs.siegeT, skydrill: !!m.techs.skydrill }));
  }

  // ③ 已删除的旧 id 一律丢弃，绝不折算成带门禁的关键节点（2026-11-14 修）
  {
    const m = mig({ era: 5, techs: { pick: true, dive: true } });
    check('③ 旧 id pick/dive 被丢弃，不点亮 skydrill（门禁节点不得由迁移白送）',
      m.techs.skydrill !== true && m.techs.pick !== true && m.techs.dive !== true,
      JSON.stringify({ skydrill: !!m.techs.skydrill, pick: !!m.techs.pick, dive: !!m.techs.dive }));
  }

  // ④ 彻底删除的旧 id（ignition/heat）被丢弃、不污染运行状态
  {
    const m = mig({ techs: { ignition: true, heat: true } });
    check('④ 彻底删除的旧 id（ignition/heat）被丢弃、不污染 techs',
      m.techs.ignition !== true && m.techs.heat !== true,
      JSON.stringify({ ignition: !!m.techs.ignition, heat: !!m.techs.heat }));
  }

  // ⑤ 已研究天穹钻机的当前玩家（奇观齐全）不受回归影响
  {
    const m = mig({ era: 5, techs: { skydrill: true },
      wonders: { wonder_shellcutter: true, wonder_presspipe: true } });
    check('⑤ 已研究天穹钻机且奇观齐全的玩家读档后 skydrill 仍为真',
      m.techs.skydrill === true,
      JSON.stringify({ skydrill: !!m.techs.skydrill }));
  }

  // ⑥ 存量脏档：老档里写死的 techs.skydrill（两座奇观没建）读档后被清洗
  {
    const m = mig({ era: 5, techs: { skydrill: true } });
    check('⑥ 存量脏档（已掌握 skydrill 但奇观未建）读档后被清掉、门禁重新生效',
      m.techs.skydrill !== true,
      JSON.stringify({ skydrill: !!m.techs.skydrill, techLv: m.techLv.skydrill }));
  }

  // ⑦ legacy 守卫：即使有人往映射表里加一条指向门禁节点的旧 id，也不得白送
  {
    const key = '__probe_gate__';
    const saved = Object.prototype.hasOwnProperty.call(SB.LEGACY_MAP, key) ? SB.LEGACY_MAP[key] : undefined;
    let m;
    try {
      SB.LEGACY_MAP[key] = 'skydrill';
      m = mig({ era: 5, techs: { [key]: true } });
    } finally {
      if (saved === undefined) delete SB.LEGACY_MAP[key];
      else SB.LEGACY_MAP[key] = saved;
    }
    check('⑦ legacy 守卫：旧 id 映射到带门禁的节点一律丢弃',
      m.techs.skydrill !== true && m.techs[key] !== true && SB.LEGACY_MAP[key] === undefined,
      JSON.stringify({ skydrill: !!m.techs.skydrill, probe: !!m.techs[key], restored: SB.LEGACY_MAP[key] === undefined }));
  }
}
