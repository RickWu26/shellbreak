# 飞升挑战候选池 · 全新机制十选 v0.1

> 状态：**纯设计层，零生产代码改动、未跑 e2e、未建榜/成就、未提交**。
> 提出：2026-11-20 用户「都有点复刻之前的感觉，还有别的什么吗」——否决 `CHALLENGE_ASCENSION_TEN_CANDIDATES_v0.1.md`
> 那批（本质是"老挑战维度换终点"）。本批**全部换血**：只从「探查确认从未被任何挑战碰过的系统」里设计。
> 依据：两轮只读代码探查（2026-11-20），覆盖 `challenges.js` 全部 20 个 challenge.id 的读取点，逐系统核对"是否被碰过"。
> 选中哪个再像前三项那样逐项拍板、单独开稿、实装。
> **v0.2（17:03）**：用户逐条改 #1/#5/#7 的名称与奖励。#1 改「无神论」+ 禁信仰全产加成 + 奖励信仰产出 +50% 且信条可重抽一次；
> #5 改「动荡年代」+ 奖励幸福度 +1；#7 改「繁盛市场今在此」+ 奖励仓储上限 +30/50/70%。id 保留（程序标识不随中文名改）。
> **v0.3（17:44）**：用户拍掉 v0.2 的三处歧义——①「信仰全产加成」**两条轴一起禁**（局内 `faithAllMul` + 跨局 `oldFaithAllProductionBonus`）；
> ②「信条重抽」不做新机制，降级为**抽选多给一个候选（四选一）**；③ #1/#5 **单档固定**（原"要不要三档"是 assistant 多问的，用户给的就是单值），#7 保留三档。见 §6。
> **v0.4（17:59）**：用户「其他的不做，实装吧，然后给出图标图要求」——**只实装 #1/#5/#7 三条**，其余七条作废。
> 生产代码已改（10 文件 + index.html 版本号），静态检查与只读探针通过；**未跑 e2e**（须用户当次明说「跑」）、
> 未建榜/成就 ID、未提交、未发版。图标提示词表见 §8。

---

## 0. 这批和上一批的本质区别

| | 上一批 v0.1（被否） | 本批 v0.1 |
|---|---|---|
| 限制维度来源 | 老挑战已用（政策卡/政体/岗位/科研成本/季节/污染/战争/壳厚/造价） | **探查确认从未被任何 challenge 碰过的系统** |
| 复刻感 | 有——换汤不换药 | 无——每个限制挂在不同的空白系统 |
| 主题 | 通用经营限制 | 全部贴"摒弃某种飞升便利、以更原始的方式攀登" |

**排除说明（体现筛选）**：
- ❌ 飞升器官 `veilFx` / 飞升点消费：终点是**研成科技（掀幕前）**，器官加成在掀幕后新局才生效，作用不到本局赛程；要做只能设计"跨多重"挑战，那终点就不是研成科技了。
- ❌ 虚境四信条 vo：探查确认 `OPENABLE_IDS=['si']`、`VOID_PLAYABLE=false`、wip 门 ⇒ 恒不可达。
- ❌ 手动采集：影响太弱。

---

## 1. 十条共用规则（与前三项一致，不重述）

终点统一 = 研成《掀起帘幕》`goal:{t:'tech',id:'beyond_veil'}`；虚境飞升不算；飞升后不消失；
打 `ascension:true` 吃通用 +10% 飞升点（`veilPeriod().points`）；单挑战制；
默认不建榜 / 不建平台成就 ID；数值全是**提议值待标定**。
档数：本批多数三档，**#1 无神论、#5 动荡年代为单档固定**（`tiers` 只有一条 `cap=null`，各贡献 +0.1 飞升点，不是 +0.3）。

### 🔴 可达性红线（两道硬门槛，任何限制不得锁死）
- `unified_field` 尤里卡 = **戴森球进度 80%**（`techs.js:1084 cond:{t:'dysonPct',n:80}`）。
- `beyond_veil` 尤里卡 = **累计星屑 ≥1000**（`techs.js:1101 cond:{t:'gathered',r:'stardust',n:1000}`，读 `s.got.stardust`）。
⇒ 凡把戴森进度或星屑累计压到"数学上不可能达标"的设计一律不进池。

### ⚠️ 飞升点膨胀
`ascMul = 1 + 0.1×总档数`。已实装 3 项 9 档 → 1.9；**每选一项 +0.3**。挑选时请一并考虑上几个。

---

## 2. 十选总表

| # | 名称 | id | 本局限制（#1/#5 单档，余三档） | 单项永久奖励 | 落点系统（全新） | 可达性 |
|---|------|-----|----------------------|--------------|------------------|--------|
| 1 | **无神论**（原「无信飞升」）**〔单档〕** | `veil_nofaith` | 全程不得装备任何信条 + 信仰全产加成**两条轴一起失效**（局内 `faithAllMul` + 跨局 `oldFaithAllProductionBonus`） | 信仰产出 +50% · 信条抽选**多一个候选（四选一）** | 信条 `faith`+信仰全产 `faithAllMul`+跨局 `oldFaithAllProductionBonus` | ✅ |
| 2 | **裸潮飞升** | `veil_nolegacy` | 本局不继承任何跨局遗产加成 | 全产出 +15/30/45% | 遗产 `legacy` | ✅ |
| 3 | **闭市飞升** | `veil_nomarket` | 禁买星屑商店任何项、禁双向兑换 | 科文产出 +50/100/200% | 星屑商店 `starPerks` | ✅ |
| 4 | **亲历飞升** | `veil_manual` | 禁自动研究/自动市政，全程手动点 | 研究成本 −5/10/15% | 自动研究 `auto-research` | ✅ |
| 5 | **动荡年代**（原「动荡飞升」）**〔单档〕** | `veil_turmoil` | 幸福度永远最低档(动荡 ×0.80)，奢侈品/奇观无法提升 | 幸福度 +1 | 幸福度 `happyMul` | ✅ |
| 6 | **无碑飞升** | `veil_nomonument` | 全程不得建造任何奇观 | 奇观效果 +10/20/30% | 奇观 `wonderBlocked` | ⚠️需核 skydrill |
| 7 | **繁盛市场今在此**（原「逼仄飞升」） | `veil_cramped` | 全部资源仓储上限 −30/50/70% | 仓储上限 +30/50/70% | 仓储 `capOf` | ✅ |
| 8 | **寸阴飞升** | `veil_realtime` | 禁离线收益 + 锁 1× 速 + 禁广告 2× | 在线全产出 +15/30/45% | 离线/倍速 `offlineCap`+`adMul` | ✅ |
| 9 | **素手飞升** | `veil_mortal` | 禁机器人分池，纯 8 职业人口推进 | 人口效率 +20/40/60% | 机器人 `robotJobs` | ✅ |
| 10 | **空瓶飞升** | `veil_blank` | 本局星屑 seed 打折 ×0.5/0.25/0 | 星屑获取 +20/40/60% | 星屑 seed `starEarnedSeed` | 🔴归零档待证 |

> 每个"落点系统"都是探查确认的**空白区**——这就是本批没有复刻感的根本原因。

---

## 3. 逐卡详述

### 1️⃣ 无神论 `veil_nofaith`（v0.3 定案 · 单档）
- **叙事**：弃绝一切信条与信仰之助，以无神之身抵达帘幕之后。
- **限制（两条）**：
  1. 全程不得装备任何信条（普通信条；四信条本来就不可达）——信条给星屑乘区 `creedStarMul`、学者科研 `creedScholarSciMul` 等。
  2. **信仰的全产加成失效，两条轴一起禁**（v0.3 用户拍「一起」）：
     - 局内 `faithAllMul(s)`（`economy.js:2781`，按信仰存量对数刻度给全资源产出加成）在本挑战局恒返回 1。
     - 跨局「旧日信仰全产档 `oldFaithAllProductionBonus`」（`prestige.js:134`、`economy.js:1221`）在本挑战局同样钳到中性值。
     ⚠️ 两者是不同来源（局内存量 vs 跨局遗产），本挑战**都禁**；但只钳"本局生效值"，不改 `doBreak` 的遗产写入（老档记录保留）。
- **落点（限制）**：① `faith.js` 的 `has()` / `tenetAvailable()` / 装备入口加 `challenges.active(s)` 守卫（预防性拦截，同 anarchy 风格）；
  ② `economy.js:2781 faithAllMul()` 开头按 active 返回 1（注意 `:1216 baseMul` 与 `:2797 faithRate` 两处读点会自动跟随，无需各改）；
  ③ `oldFaithAllProductionBonus` 在 `economy.js:1221` 的读点按 active 钳中性（**注意不能污染 `prestige.js:134` 的跨局账本本身**）。
- **奖励（v0.3 定案）**：
  1. **信仰产出 +50%** —— `economy.js:2797 faithRate()` 整段乘区加独立 `tierDone` 行（乘在 return 链末尾；注意反自指纪律——faithRate 不吃 faithAllMul，本项不受本挑战的"禁信仰全产"影响）。
  2. **信条抽选多一个候选（四选一）**（v0.3 用户拍「多一个候选吧」，**不做重抽新机制**）：
     - `faith.js:90 createDraft()` 的 `pool.slice(0, 3)` → 按 meta 档位取 4；`faith.js:103 normalizeDrafts()` 的 `opts.length < 3` 同步放宽到 4（否则读档时第 4 个候选会被截掉）。
     - ✅ **无需新增存档字段、无需新函数、无需新按钮**：`render-pane-faith.js:39-45` 与 `ai-strategy.js:1629` 都是遍历 `draft.options`，候选数自适应；仅需视觉确认四候选布局不挤。
     - 语义：本项是跨周目永久值（`tierDone`），本挑战局禁信条所以用不上，飞升后新局生效。
- **可达性**：✅ 信条与信仰全产都是加速器非门槛，禁掉只变慢，不碰戴森 80% / 星屑 1000 两道硬门。

### 2️⃣ 裸潮飞升 `veil_nolegacy`
- **叙事**：斩断一切前世遗产，赤条条从 ERA1 爬到帘幕。
- **限制**：本局所有跨局遗产加成失效——遗迹科研/文化、旧日信仰全产、旧艺术品文化、旧石碑科研、商店档案加成（`prestige.legacy()` 派生出的 `relicScienceMul`/`oldFaithAllProductionBonus`/`shopScienceBonus` 等全部按 active 返回中性值）。
- **落点**：`prestige.js:118-142 legacy()` 在派生时按 `challenges.active(s)` 把各项乘区钳到 1／加成项钳到 0。
  ⚠️ 只钳 `legacy()` 这一处，不动 `doBreak` ②–⑤的写入（老档遗产照常记录，只是本挑战局不生效）。
- **奖励**：全产出 +15/30/45% —— `challenges.js:474 productionMul` 加独立 `tierDone` 行（与飞升苦旅那行并存、各读各的）。
- **可达性**：✅ 遗产是加速器；清零后赛程变长但两道硬门照常可达。

### 3️⃣ 闭市飞升 `veil_nomarket`
- **叙事**：不花一枚星屑，不借商店之力。
- **限制**：本局不得购买任何星屑商店项（`starPerks` 全禁），不得用轮回点↔星屑双向兑换。
- **落点**：`prestige.js:709-757 starPerkState/buyStarPerk` + `:765-807 exchange*` 加 `challenges.active(s)` 守卫；`input.js:915` 购买入口无需改（复用 `starPerkState.locked`）。
- **奖励**：科文产出 +50/100/200% —— `challenges.js:492 scienceCultureMul` 加独立 `tierDone` 行。
- **可达性**：✅ 星屑 seed 来自破壳结算（`stardustGain`）不是商店，禁商店不锁 1000 门槛；星尘回流/壳压等只是加速器。

### 4️⃣ 亲历飞升 `veil_manual`
- **叙事**：每一点科技、每一道市政，亲手点亮。
- **限制**：禁自动研究 / 自动市政（`autoStudy`/`autoCivic` 轮回商店项失效），全程手动点。
- **落点**：`auto-research.js:12 unlocked()` 按 `challenges.active(s)` 返回 false；`game.js` 自动研究泵（`:621-661` 一带）读该守卫。
- **奖励**：研究成本 −5/10/15% —— `challenges.js:437 researchCostMul` 加 `tierDone` 折扣行（形状照 `eternity_moment` 奖励）。
- **可达性**：✅ 纯手动，慢但可达；两道硬门不受影响。

### 5️⃣ 动荡年代 `veil_turmoil`（v0.3 定案 · 单档）
- **叙事**：在最深的动荡里，依然把文明推向群星。
- **限制**：幸福度**永远**最低档（×0.80，`economy-social.js:212 HAPPY_TIERS` 最低档），奢侈品供给与奇观 happyBonus 均无法抬升。
- **落点**：`economy-social.js:192 happyMul()`（及 `happyTier()`）按 `challenges.active(s)` 强制返回最低档；注意 happy 快照纪律（`economy-tick.js:62-65`）要读同一份钳制值，避免面板与实账不符。
- **奖励（v0.3 定案 · 单档）**：**幸福度 +1** —— `economy-social.js:28 happyBonusTotal()` 加一项 `tierDone` 加成（与政体 `govHappyBonus`、奇观 `happyBonus`、perk 同口径的常驻偏移，进 `_gb` 基线被 happyMech 剥除，不额外烧 luxury）。
  ⚠️ 三处同源必须同批改：`happyBonusTotal()`、`economy.js happyStep 的 _gb`、`economy.js happyLedger.bonusParts`（注释 `:26-40` 已明确这三处同口径）。
  ⚠️ 语义张力：本挑战**限制**把幸福钉死最低档、**奖励**却 +1 幸福度——奖励是跨周目永久值（`tierDone`），本挑战局内被限制钳制不体现，飞升后新局才生效。
- **可达性**：✅ ×0.80 全产减速；与"深渊重压"区别在于走幸福系统间接、主题是"逆境升华"，非直接乘区。

### 6️⃣ 无碑飞升 `veil_nomonument`
- **叙事**：不留一块丰碑，空手掀帘。
- **限制**：全程不得建造任何奇观。
- **落点**：`workshop.js wonderBlocked()` 加 `challenges.active(s)` 一律返回"挑战禁用"；这是现成守卫函数（已读 `challengeOnly`/`need`），加一行即可，AI 筹料也自动跟随（`ai-strategy.js:821` 等读它）。
- **奖励**：奇观效果 +10/20/30% —— `wonder.js` 各出口统一乘区加 `tierDone` 行（**需新造一个统一读数点**）。
- **可达性**：⚠️ 待核——`unified_field` 前置是戴森 80%，破壳可能依赖 skydrill 奇观（`wonder_skydrill`）。若破壳必需奇观，则此挑战死锁，**须先查证**再决定保留。

### 7️⃣ 繁盛市场今在此 `veil_cramped`（v0.2 改）
- **叙事**：（东方 Project 梗）仓廪逼仄偏要开成繁盛市场，把有限空间用到极致。
- **限制**：全部资源仓储上限 −30/50/70%（`capOf` 返回值按档乘系数）。
- **落点**：`economy.js:319 capOf()` 在末尾按 `challenges.active(s)` 乘系数；⚠️ `science`/`culture`/`luxury`/`faith` 与 craft 类本就无上限（`CAP_BASE` 无键 ⇒ Infinity），"砍半"对它们无效——所以实际限制的是**建材/材料囤积**，影响建筑与奇观筹备，间接拖慢赛程。可达性成立。
- **奖励（v0.2 改）**：仓储上限 **+30/50/70%**（原 +20/40/60%）—— `capOf` 里加 `tierDone` 行，档值改为 `[0,0.3,0.5,0.7]`（与限制各读各的档，一个本局一个 meta）。
- **可达性**：✅ 科研点无仓储上限，两道硬门不受影响。

### 8️⃣ 寸阴飞升 `veil_realtime`
- **叙事**：不假时间之风——不靠离线挂机、不靠倍速与广告，只以真实的一倍速攀登。
- **限制**：三档叠加同一主题——离线收益归零（`offlineCap→0`）、速度锁 1×（`setSpeed` 拒绝 >1）、广告 2× 失效（`adMul→1`）。档位可分级给：档1 只禁广告、档2 加禁倍速、档3 全禁含离线。
- **落点**：`game.js:1720 offlineCap()`、`:89 setSpeed()`、`:95 adMul()` 按 `challenges.active(s)` 钳制。⚠️ 限时成绩按墙钟（`challenges.js:678 Date.now()`），本挑战不限时、无冲突。
- **奖励**：在线全产出 +15/30/45% —— `productionMul` 独立 `tierDone` 行。
- **可达性**：✅ 纯在线游玩可达；但极肝（447M 科研 × 无加速），标定权在用户。

### 9️⃣ 素手飞升 `veil_mortal`
- **叙事**：不借机械臂，以血肉之躯抵达群星。
- **限制**：机器人分池全禁（`robotJobs`/`robotMult` 归零），产线全靠 8 职业人口。
- **落点**：`folk.js:336-407 robotJobs/robotMult` 按 `challenges.active(s)` 返回 0/1；人口职业分配逻辑不动。
- **奖励**：人口效率 +20/40/60% —— `folk.js` 职业产出乘区加 `tierDone` 行（**需新造读数点**，形状参照 `soldierOutputMul`）。
- **可达性**：✅ 机器人是产线加成，禁掉慢但不死锁。

### 🔟 空瓶飞升 `veil_blank`（🔴 高风险，归零档待证）
- **叙事**：前世星屑一概不认，只认此生攒下的。
- **限制**：本局 `s.got.stardust` 的 seed 打折——档1 ×0.5、档2 ×0.25、档3 ×0（即不吃历史累计）。
- **落点**：`state.js:260-265 starEarnedSeed()` 按 `challenges.active(s)` 把 seed 乘系数。单点、影响面小（只本挑战局）。
- **奖励**：星屑获取 +20/40/60% —— `stardustGain` 独立 `tierDone` 行。
- **🔴 可达性警示**：`beyond_veil` 尤里卡要求本局 `s.got.stardust ≥ 1000`；若 seed 归零且本局内无其他累计途径，**档3 数学上死锁**。必须先做可达性专核（查 `doBreak`/`freshRun` 写 `got.stardust` 的全路径）才能定档3。
  - **安全替代**：若归零死锁，改为「`beyond_veil` 的星屑 cond.n 翻倍到 2000/3000/5000」——`condMet` 加 active 倍率，多玩几轮历史累计可达，不死锁。

---

## 4. 落地成本速查（挑选参考）

| 成本 | 候选 | 说明 |
|---|---|---|
| **低**（现成守卫/读数点，1-2 行） | #3 闭市、#4 亲历、#6 无碑 | 有现成 `locked()` / `unlocked()` / `wonderBlocked()` 守卫函数 |
| **中**（现成函数加钳制/独立行） | #1 无神论（v0.3 降级后：`createDraft`/`normalizeDrafts` 取数 + 两条信仰全产钳制，**无新存档字段**）、#2 裸潮、#5 动荡年代、#7 繁盛市场、#10 空瓶 | 单点函数（`legacy`/`happyMul`+`happyBonusTotal`/`capOf`/`starEarnedSeed`）|
| **中高**（需新造读数点或动主循环） | #8 寸阴（动 `game.js` 三处）、#9 素手（新造人口产出读数） | — |

ℹ️ v0.3 把 #1 从「中高」降为「中」：用户否决重抽新机制、改「多一个候选」，落地只剩 `faith.js:90/:103` 两处取数放宽 + 两条全产钳制；UI 与 AI 遍历 `options` 自适应，不用改。

---

## 5. 实装通用清单（选中后逐条做）

与上一批 v0.1 §3 完全相同：进度白名单 3 处（`challenges.js emptyProgress` / `state.js` 两处）+ `ascension:true` +
本地成就 `achv.js` + i18n 三语 + 图标 + 榜单默认不建 + 同一文件串行 Edit + e2e（跑前须用户当次明说「跑」）。
⚠️ 本批多数限制落在 `challenges.active(s)` 守卫里，**必须在 `active()` 里为每个新 id 返回正确的 a 对象**，
否则守卫拿不到 active、限制形同虚设——这是本批特有的头号风险点。

---

## 6. v0.3 三条歧义已拍（2026-11-20 17:44）

| # | 原歧义 | 用户拍板 | 落文档处 |
|---|---|---|---|
| 1 | 「信仰也不会有全产加成」范围 | **一起**：局内 `faithAllMul` + 跨局 `oldFaithAllProductionBonus` 两条轴都在本挑战局失效 | §3 #1 限制 ②、落点 ③ |
| 2 | 「信条可重抽一次」怎么实现 | **多一个候选即可**（四选一），不做 reroll 新机制 | §3 #1 奖励 2、§4 成本降档 |
| 3 | #1/#5 单值 vs #7 三档，是否统一 | #1/#5 **单档固定**（用户「1和5哪来的三档？」= 本来就是单值，是 assistant 多问）；#7 保留三档。各贡献飞升点 +0.1 / +0.3 | §1 档数、§2 总表〔单档〕标注 |

ℹ️ #5 语义张力（限制钉死最低档、奖励却 +1 幸福度）本轮未单列提问，沿用 §3 #5 的既定处理：**奖励是跨周目永久值，本挑战局内被限制钳制、飞升后新局才生效**（与 #1 信条奖励同口径）。

---

## 7. 纪律确认

- v0.1–v0.3 为**纯设计层**（零 `src/` 改动）；v0.4 起 **#1/#5/#7 三条已实装**（见 §7.1），其余七条仅作候选留档。
- 未跑 e2e（须用户当次明说「跑」）、未建榜/成就 ID、未提交、未发版、未调用生图工具。
- #6 无碑飞升的可达性（skydrill 是否破壳必需）、#10 空瓶飞升的归零档死锁——两处已明确标红，**未证不进实装**。

### 7.1 v0.4 实装落点（#1/#5/#7）
- `challenges.js`：三条定义（`ascension:true` + goal `tech/beyond_veil`）+ emptyProgress 白名单；#1/#5 单档 cap:null，#7 三档 cap 0.3/0.5/0.7。
- `state.js`：freshMeta + challengeIds + singleTier（#1/#5）三处白名单。
- #1：`faith.js` — `has()`/`choose()` 按 active 守 veil_nofaith（禁装备+禁信条效果）；`createDraft`/`normalizeDrafts` 按 tierDone 取 3 或 4 个候选。`economy.js` — `faithAllMul` 与 baseMul 的 oldFaith 档按 active 钳中性；`faithRate` 加信仰产出 ×1.5 永久奖励。
- #5：`economy-social.js` — `happyTier` 按 active 钳最低档（×0.80）；共享 `veilHappyBonus()` 供三处同源读取。`economy.js` — happyStep `_gb` 与 happyLedger `bonusParts` 各加一处调用。
- #7：`economy.js` — `veilCrampedCapMul(s,k)`（本局限制 × 永久奖励，**排除 starExplore 结局阈值**），capOf 的 kelp/mat 两条返回路径各乘一次。
- `render-pane-challenges.js`：goalText 分支纳入三条新 id（否则显示「完成戴森球」）。
- 三语言包各 +20 key；`achv.js` 三条本地成就（无 CFG.ACHV 平台 ID）；index.html 10 处 `?v=` bump。
- 静态：10 个 JS `node --check` 全通过；只读探针确认三条注册/档位/tierDone/ascensionTierCount（本批 +5 档）。

---

## 8. 图标提示词表（给 GPT 出图用，我不调用生图工具）

统一风格约束（**与飞升挑战第一批完全同一前缀**，保证六张图标一套风格），写进每条 prompt 前缀：
`flat vector game achievement badge, centered symmetric composition, bold silhouette, limited palette of deep ocean blue / abyss teal / stardust gold, subtle glow, transparent background, no text, no letters, 512x512, suitable for a dark fantasy idle game challenge icon`

✅ **v0.5（20:44）已接入**：用户出图并放进 `assets/challenges/`（三张均 1254×1254 PNG，主体与三挑战一一对应；#1 经卷上是不可辨识的伪文字纹理、无可读字，裁两段放大确认）。已把 `challenges.js` 三条 badge + `achv.js` 三条 icon 从占位路径换成对应最终文件名，`index.html` 两处 `?v=` bump（challenges 35→36、achv 17→18）。

⚠️ 风格备注：三张虽同 prefix 出图，实际画风偏「厚涂写实奇幻」而非 flat vector（#7 更是东方 Project 二次元风），与前六张飞升图标不完全一套——已在案，**出图即定稿，不重做**。若日后要统一，需全部六+三张重出。

| 挑战 | 文件名（按 id，不随中文名改） | 画面主体（中文说明） | 英文 prompt 主体（接在统一前缀后） |
|---|---|---|---|
| #1 无神论 | `challenge-veil-nofaith-illustrated.png` | 一座倒塌的神庙祭坛，信条卷轴断裂、香火熄灭，一道人形剪影背对祭坛独自走向半掀的帘幕，表现"弃绝一切信仰、无神而升" | `a collapsed temple altar with broken scripture scrolls and extinguished incense, a lone human silhouette turning away from the altar walking toward a half-lifted veil curtain, motif of abandoning all faith` |
| #5 动荡年代 | `challenge-veil-turmoil-illustrated.png` | 惊涛骇浪中一叶文明方舟剧烈颠簸，天空翻滚着风暴与裂电，船头一只不屈的火炬仍指向半掀的帘幕，表现"至暗动荡中仍向前" | `a civilization ark tossing violently in a stormy abyss, turbulent waves and cracking lightning in the sky, an unyielding torch at the bow still pointing toward a half-lifted veil curtain, motif of persevering through turmoil` |
| #7 繁盛市场今在此 | `challenge-veil-cramped-illustrated.png` | 一间被四壁挤压得极小却摆满货物、灯火通明的繁华集市摊位，货架层层叠叠向天穹延伸，顶端一道半掀的帘幕，表现"逼仄之中开成繁盛市场"（东方 Project 式奇幻市集感） | `a bustling brightly-lit fantasy market stall crammed between closing walls, goods and shelves stacked densely upward toward the sky, a half-lifted veil curtain at the top, motif of a flourishing market in a cramped space, eastern fantasy bazaar atmosphere` |

---

## 9. #7 繁盛市场图标重出提示词（2026-11-21 · 用户「用掌握永远与须臾那个图标的风格做」）

范围：**只重做 #7 繁盛市场今在此这一张**；#1/#5 与上一批六张不动。
参照 = `assets/challenges/challenge-eternity-moment.png`（384×384，深蓝月夜剪影风）。
推翻 §8 末尾「出图即定稿，不重做」在 #7 上的约定——此处为新的最终稿。

**视觉语法迁移**（参照 → #7）：满月背光 / 长发剪影仰头 / 青蓝细圆环 / 淡金斜光痕 / 飘带 / 铜金圆角边框 / 低饱和留白 → 全部保留；四角竹叶换珊瑚海藻剪影，人物旁的空场换成**两侧向内挤压、被满月勾边的层叠摊棚·货架·吊灯剪影**，表达「逼仄之中开成繁盛市场」。

**可直接复制的提示词（英文）**：

```
game achievement badge illustration, square 1:1 composition, deep midnight-navy and indigo palette, a huge luminous full moon with subtle crater texture as the central backlight, a lone long-haired traveler-merchant seen from behind in dark silhouette standing among densely stacked market stalls, head tilted up toward the moon, flowing hair and garments dissolving into dark flowing ribbons, layered stall canopies, hanging lanterns and shelves of goods compressed into near-black silhouettes on both sides pressing inward, all rim-lit by cold moonlight, one thin glowing cyan circular ring (hairline arc) encircling the figure, a single slender pale-gold light streak slanting across the scene, wispy mist and drifting fabric folds, faint coral and seaweed silhouettes in the corners, ornate rounded-rectangle frame with thin antique bronze-gold double border and subtle filigree, cinematic rim light, moody atmospheric depth, low saturation, poetic and generous negative space, silhouette-based not a bright anime character, no text, no letters, no watermark, in the exact moonlit silhouette style of a dark fantasy achievement icon
```

**Negative prompt（按需填）**：

```
bright saturated colors, chibi anime character, cel shading, thick black outlines, neon cyan border, visible detailed face or eyes, any text, letters, numbers, watermark, cluttered foreground, white or pale background, flat vector style
```

**出图落地约定**：
- 正方形，建议 1024×1024 或 1254×1254（与现图一致），出完覆盖同名文件 `assets/challenges/challenge-veil-cramped-illustrated.png` 即可——`challenges.js` 的 badge 与 `achv.js` 的 icon 都指向该路径，**代码零改动**。
- 若浏览器仍显示旧图，强刷或给该 `<img>` 的 src 加 `?v=` 即可；无需改游戏逻辑。
- 我只产出提示词，未调用生图工具（不消耗信用点）。

## 10. 全部成就图标统一边框（2026-11-21）

用户后续要求：所有成就图标统一使用铜金奇幻边框，本轮已覆盖 `src/achv.js` 引用的全部图标资源。

- 共用边框母版：`assets/achievements/achievement-copper-gold-frame.png`。
- 后续制作新成就图时，先生成无边框画面，再叠加这张母版；不要另做青色、蓝色或风格不同的边框。
- SVG 成就图标也使用同一母版边框，缩放到图标画布后嵌入。
