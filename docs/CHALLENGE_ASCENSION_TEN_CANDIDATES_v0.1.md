# 飞升挑战候选池 · 十选 v0.1

> 状态：**纯设计层，零生产代码改动、未跑 e2e、未建榜、未建成就 ID、未提交**。
> 提出：2026-11-20 用户「看看再来点飞升挑战，设计十个我来挑选」。
> 定位：这是**点子池**，供用户筛选；选中哪个再像前三项那样逐项拍板、单独开稿、单独实装。
> 依据：`src/challenges.js`（DEFINITIONS / goalMet / active / award / 各乘区读数）、
> `src/prestige.js`（veilPeriod / stardustGain / doVeil）、`src/civics.js`（cardBlocked / govBlocked）、
> `src/economy.js`（productionMul / capOf / costOf / 季节 / 污染）、`src/war.js`（action 拦截 / enemyRecoveryMul）、
> 前三项已实装稿 `CHALLENGE_VEIL_RUSH_DESIGN_v0.1.md` + `CHALLENGE_ASCENSION_POOL_v0.1.md`。

---

## 0. 十条通往同一终点的规则（所有候选共用，先读）

这十条是全池的**硬约束**，任何候选都不得违反：

1. **终点统一 = 研成《掀起帘幕》科技**：`goal: { t:'tech', id:'beyond_veil' }`，主循环 `game.js:1708` 每帧 `evaluate()` 判定，
   研成瞬间落账到 `meta.challenges`，**零 `doVeil` 插桩**。
2. **虚境飞升（`s.dysonDone`）不算**：终点只读 `s.techs.beyond_veil`。
3. **飞升后不消失**：完成档位写 meta、`doVeil` 清场不碰 `meta.challenges`、奖励读 `tierDone(meta)`。
4. **打 `ascension:true`**：计入 `ascensionTierCount()` → `veilPeriod().points` 的 `ascMul = 1 + 0.1×档数`
   （`prestige.js:389-397`）。**绝不碰轮回点的 `challengePointMul`**——两套货币两条账。
5. **三档结构**：每候选三档，`cap` 存限制强度；从档1（宽）到档3（严）。数值全是**提议值，待标定**。
6. **单挑战制**：同一局只能跑一个。这十个是**备选池**，玩家一个个玩，不叠加。
7. **限制走预防性拦截优先**：能在 `war.js` / `civics.js` / `folk.js` 入口直接拦（按钮禁用+提示）的，
   不做"违规计数事后判失败"——项目惯例（见 pacifist / anarchy 注释）。
8. **卡关即失败**：goal 型挑战没有"超时"通用分支（限时只有竞速家族），所以"失败"体现为
   **研成科技那一刻附加条件没满足 → goal 不成立 → 不发奖、卡在"研成了没通关"**。少数候选带附加条件，已逐条标注。
9. **可达性铁律**：任何限制都不得让《掀起帘幕》的硬门槛死锁——前置 `unified_field`、
   研究点 `447M`、累计星屑 `s.got.stardust ≥ 1000`（`techs.js:1100-1101`）。每个候选的 §可达性已核。
10. **实装通用清单**（选中后每项都要做，见文末 §3）：进度白名单 3 处 + 成就 + i18n 三语 + 图标 + e2e 断言段。

### ⚠️ 挑选前必知的膨胀效应
`ascMul = 1 + 0.1 × 飞升挑战总档数`。现已实装 **3 项 × 3 档 = 9 档 → 1.9**。
从本池每选一个三档挑战，满值 `+0.3`：**十个全做 = 39 档 → ascMul = 4.9**（飞升点产出近 5 倍）。
这是数值标定问题，挑选时请一并考虑要上几个；我只报结构，不标定。

---

## 1. 十选总表（一眼挑选）

| # | 名称 | id | 本局限制（提议三档） | 失败 / 卡关机制 | 单项永久奖励（提议三档） | 落地成本 |
|---|------|-----|----------------------|-----------------|--------------------------|----------|
| 1 | **断律飞升** | `veil_lawless` | 全程禁装备政策卡（复用 anarchy，"轮回之终末"例外） | 预防性拦截（装不上卡）；无卡关 | 全资源存储上限 +20/40/60% | 低·拦截现成，奖励需新造1处 |
| 2 | **素王飞升** | `veil_tribal` | 全程保持酋邦制，禁换政体（复用 good_old_days） | 预防性拦截；换政体按钮禁用 | 初始影响力 +2/4/6 + 解锁所采用政体被动卡 | 低·拦截现成，奖励需新造1处 |
| 3 | **愚海飞升** | `veil_dunce` | 学者/书手各 ≤ 12/8/4 人（复用 science 的 jobLimit） | 预防性拦截（超员分配不了）；无卡关 | 科文(研究点)产出 +50/100/200% | **极低·全现成** |
| 4 | **寸积飞升** | `veil_grain` | 科技研究点成本 ×5/10/20（复用 researchCostMul 快照口径） | 折磨型（磨到研成就赢） | 永久研究点成本 −5/10/15% | 低·限制+奖励均现成 |
| 5 | **极夜飞升** | `veil_polar` | 寒流季必冰封、时长 ×2/3/4，暖流产出 ×0.5（复用 drift_terra 季节） | 折磨型 | 暖流季全产出 +15/30/45% | 中·季节机制现成但需按 id 扩写 |
| 6 | **浊渊飞升** | `veil_turbid` | 热液能排污、五阶段污染全开（复用 waterpollution） | 卡关条件：研成时污染须回落到「浊流」以下 | 星屑获取 +10/20/30% | 中·污染机制现成，卡关条件需新造 |
| 7 | **止戈飞升** | `veil_peace` | 禁全部战争行动与吞并（复用 pacifist 拦截） | 预防性拦截；无卡关 | 软实力(信仰/文化)成本 −15/25/35% | 低·拦截现成，奖励需新造1处 |
| 8 | **孤星飞升** | `veil_lonestar` | 敌国规模恢复速度 ×2/3/4（复用 conqueror 的 enemyRecoveryMul） | 折磨型 | 全产出 +10/20/30% | 低·恢复现成，奖励现成 |
| 9 | **重壳飞升** | `veil_heavyshell` | 冰壳厚度 ×2/3/4（复用 shellTarget 快照口径） | 折磨型 | 破壳星屑收益 +20/40/60% | 低·壳厚现成，奖励需新造1行 |
| 10 | **筚路飞升** | `veil_toil` | 建筑造价 ×2/3 + 生育时间 ×3/4（复用 costOf / growthDuration） | 折磨型 | 建筑造价 −10/15/20% | 中·生育现成，造价乘区需新造 |

> **落地成本**说明：「极低」= 限制与奖励都读现成函数、几乎零新机制；「低」= 拦截/限制现成，奖励要加 1 个读数；
> 「中」= 需要为它扩写一处现成机制或新造一个卡关条件。挑选时优先「极低/低」性价比最高。

---

## 2. 逐卡详述

### 1️⃣ 断律飞升 `veil_lawless`
- **叙事**：不许借任何政策之力的"裸奔"飞升，只靠文明本身的构造掀帘。
- **限制**：全程不得装备任何政策卡（"轮回之终末"除外）——与「安那其主义」同款口径。
- **落点**：`civics.js:1414 cardBlocked` 的 `activeChallenge.id === 'anarchy'` 扩成 `anarchy || veil_lawless`；
  UI 卡位禁用与进度文案同步（现有 `ui.challenge.progress.anarchy.*` 加分支）。
- **失败**：预防性拦截，玩家根本装不上卡，不存在"违规失败"。
- **奖励**：永久全资源存储上限 +20/40/60%——落 `economy.capOf`（`economy.js:319`）加一个 `tierDone` 读数（**需新造**）。
- **可达性**：✅ 政策卡是加速器不是硬门槛；禁掉只是慢，研成科技无阻。

### 2️⃣ 素王飞升 `veil_tribal`
- **叙事**：自始至终抱守最初的秩序，以酋邦之身直抵群星。
- **限制**：全程保持酋邦制，不得切换政体（复用 good_old_days 的 `governmentLocked`）。
- **落点**：`challenges.js:334 governmentLocked` / `:330 bypassGovernmentGates` 从只认 `good_old_days` 扩为并列认本 id；
  门槛豁免同款（要求多槽/指定政体的科技市政一律豁免）。
- **失败**：预防性拦截，换政体按钮禁用。
- **奖励**：永久初始影响力 +2/4/6（落 `startingMeta`/`freshMeta`，需新造1处）+ 解锁所采用政体被动卡
  （复用 `good_old_days` 的 `onComplete` → `civic.unlockAdoptedGovPassiveCards`，现成）。
- **可达性**：✅ 有门槛豁免，不会因政体锁死科技链。

### 3️⃣ 愚海飞升 `veil_dunce`（**性价比最高**）
- **叙事**：弃绝学者与书手，以最朴素的众人推力撬动天穹。
- **限制**：学者/书手岗位人数各 ≤ 12/8/4 人（三档比 science 的 15/10/5 略严）。
- **落点**：`challenges.js:456 jobLimit` 从只认 `science` 扩为并列认本 id（读 `activeTier(s).cap`）；
  `:462 jobLimitReason`、`:470 jobLimitExceeded`、`folk.js:153` 三处同步。
- **失败**：预防性拦截，岗位分配器到上限即停；无卡关。
- **奖励**：永久科文(研究点)产出 +50/100/200%——`scienceCultureMul`（`challenges.js:492`）现成，加一行 `tierDone` 即可。
- **可达性**：✅ 研究点是按秒产出、无岗位硬门槛（岗位只影响速率），磨时间可达 447M。

### 4️⃣ 寸积飞升 `veil_grain`
- **叙事**：每一分研究都要付出数倍代价，寸积铢累方成帘幕。
- **限制**：科技研究点成本 ×5/10/20（三档）——与「掌控永远与须臾」同款口径，**只乘研究点成本**。
- **落点**：`challenges.js:437 researchCostMul` ——注意该函数读 `recordedMultiplier(s)`（档位快照，达成前后恒定），
  本 id 加一条快照分支；⚠️ 不可复用 `multiplier`（达成即塌回，分母会跳）。
- **失败**：折磨型，无硬失败，磨到研成就通关。
- **奖励**：永久研究点成本 −5/10/15%——同函数叠加 `Math.max(0,1−0.05×tierDone)`（现成形状，照 eternity_moment 办）。
- **可达性**：✅ 20× 时 447M×20 ≈ 8.94B 研究点，很长但可达；标定权在用户。

### 5️⃣ 极夜飞升 `veil_polar`
- **叙事**：永夜压境，寒潮久驻，在冰封的间歇里完成飞升。
- **限制**：寒流季必定冰封且时长 ×2/3/4，暖流季产出 ×0.5（drift_terra 同款机制，档值我提议）。
- **落点**：`economy.js` 季节段 + `economy.lockSeasonLengths`（drift_terra 已用它，`challenges.js:81-85`），按 id 扩写；
  寒流必冰封的硬编码 id 判断处同步加本 id。
- **失败**：折磨型。
- **奖励**：暖流季全产出 +15/30/45%（复用 drift_terra 的"暖流季全产 +30%"落点，按档给值）。
- **可达性**：✅ 有产出基底，只是被季节调制，不会死锁。

### 6️⃣ 浊渊飞升 `veil_turbid`
- **叙事**：热液即排污，在海逐渐腐坏之前掀开帘幕。
- **限制**：热液能建筑每秒排放等值污染，五阶段（浊流/赤潮/死区/腐渊）逐级侵蚀幸福、藻食、人口（完全复用 waterpollution）。
- **落点**：`economy.js` 的 `pollution*` 函数族目前硬编码 `s.challenge.id === 'waterpollution'`，需扩为并列认本 id。
- **失败/卡关**：附加条件——`goal = { t:'all', of:[ {t:'tech',id:'beyond_veil'}, {t:'res',r:'pollution',n:阈值} ] }`，
  研成时污染必须已压回阈值以下（**新造卡关条件**：pollution 现为 s 上的数但非 RESS 键，goal.res 读 `s.res`，需新一条
  `t:'pollution'` 分支读 `s.pollution`，参照 `goal.t==='annex'` 的写法）。
- **奖励**：星屑获取 +10/20/30%——`prestige.js:648 stardustGain` 加独立一行 `tierDone`（⚠️ 不并九项共享的 `stardustRewardMul`、不并水体污染那行、不并飞升竞速那行）。
- **可达性**：⚠️ 需核——污染致死者读数不影响科技前置，但高死亡可能拖慢 447M；用户拍板后再做可达性专核。

### 7️⃣ 止戈飞升 `veil_peace`
- **叙事**：不以刀兵惊扰深渊，以纯粹的建设抵达彼岸。
- **限制**：全程不得进行劫掠/入侵/全面战争，也不得吞并（pacifist 的禁战争 + 吞并补禁）。
- **落点**：`challenges.js:344 warActionBlockedReason` 加本 id（返回 `veil_peace`）+ 吞并入口 `annexEnemy` 顶部拦；
  UI 战争三按钮 + 吞并按钮禁用。
- **失败**：预防性拦截。
- **奖励**：软实力(信仰/文化渗透)成本 −15/25/35%——`war.js` 的 `softPowerCost` 加 `tierDone` 读数（**需新造1处**，形状参照 `warCostMul` `:378`）。
- **可达性**：✅ 战争是可选玩法，禁掉不影响科技链。

### 8️⃣ 孤星飞升 `veil_lonestar`
- **叙事**：群敌环伺、此消彼长，在无尽恢复的敌潮里孤身飞升。
- **限制**：敌方规模恢复速度 ×2/3/4（复用征服者 `enemyRecoveryMul`，`challenges.js:371` 读 `activeTier(s).cap`；征服者自己只用到 1.5/2/3，本项另给 2/3/4）。
- **落点**：`challenges.js:371 enemyRecoveryMul` 从只认 `conqueror` 扩为并列认本 id；`war.js:382 recoverEnemy` 无需改。
- **失败**：折磨型。
- **奖励**：全产出 +10/20/30%（三档）——`productionMul`（`challenges.js:474`）加独立一行 `tierDone`。
- **可达性**：✅ 敌国恢复只增加经营压力，不碰科技门槛。

### 9️⃣ 重壳飞升 `veil_heavyshell`
- **叙事**：天壳厚重如铅，以加倍的重压锤炼出穿壳之力。
- **限制**：冰壳厚度 ×2/3/4（复用 shellTarget 的档位快照口径，`challenges.js:426 shellTarget` + `applyShellTarget` `:431`）。
- **落点**：`challenges.js:411 recordedMultiplier` 从只认 `eternity_moment` 扩为并列认本 id（读档位 `cap`）；
  `state-migrate.js:609/627` 的壳厚重算、`applyShellTarget` 同步。
- **失败**：折磨型。
- **奖励**：破壳星屑收益 +20/40/60%——`prestige.js:648 stardustGain` 加独立一行 `tierDone`（与断律/浊渊的 stardustGain 行各自独立）。
- **可达性**：✅ 壳更厚只是前期慢，破壳照常发生，之后一路到 ERA11。

### 🔟 筚路飞升 `veil_toil`
- **叙事**：以最昂贵的土木与最缓慢的人口，筚路蓝缕开启星门。
- **限制**：建筑造价 ×2/3 + 生育时间 ×3/4（造价档我提议两档有效，或三档 ×1.5/2/3）。
- **落点**：生育时间走 `challenges.js:505 growthDuration`（现成，扩 id 读 `activeTier.cap`）；
  建筑造价 `economy.js:665 costOf` **目前无挑战乘区，需新造**一个 `challenges.buildCostMul(s)` 并在 costOf/可负担/造价文本三处接入。
- **失败**：折磨型。
- **奖励**：建筑造价 −10/15/20%——与限制同一 `buildCostMul`，达成后叠加 `tierDone` 折扣（形状参照 `researchCostMul`）。
- **可达性**：⚠️ 造价 ×3 叠加长赛程会很肝；数值标定权在用户，做可达性专核后再定档值。

---

## 3. 实装通用清单（选中某项后逐条做）

| 项 | 落点 | 漏了会怎样 |
|----|------|-----------|
| 进度白名单 3 处 | `challenges.js:256 emptyProgress`、`state.js:73`、`state.js:948/953` 各加 id | 老档无键 → `tierDone` 恒 0 → 反复领奖 |
| `ascension:true` 标记 | 定义里打上 | 不计入 `ascensionTierCount` → 拿不到通用 +10% 飞升点 |
| 本地成就 | `achv.js` 加定义（`achievementKey` 对齐）；平台成就 ID 暂不建（沿用本系列惯例） | 成就不亮 |
| i18n 三语 | `zh-CN.js` / `en-US.js` / `zh-TW.js` + `i18n_text_inventory.xlsx` 登记 key | TapTap 构建恒 zh-CN，缺 key 显示占位 |
| 图标 | 用户找 GPT 出图，放 `assets/challenges/`，`index.html` bump `?v` | 死链 |
| 榜单 | **默认不建**（本系列惯例：不填 `rankKey`，不提交不存在的榜）；要建另需当次明说 | 提交到空榜 ID |
| 限制落点 | 按每卡 §落点扩写，同一函数多 id 并列时**串行 Edit**，改完 grep 回盘终值 | 并行 Edit 互相覆盖 |
| e2e 断言段 | `sim/e2e.mjs` 加专用段；跑前**须用户当次明说「跑」** | — |

---

## 4. 纪律确认

- 本稿 v0.1 **零 `src/` 改动、零回归、零榜单/成就/图标创建、零提交、零生图调用**。
- 十条全是**候选点子**，不是决定；选哪些、每条数值多少，标定权与拍板权都在用户。
- 「可能失败」不全靠限时：本池用「预防性拦截」（做不了违规操作）与「卡关条件」（研成时附加条件不满足不发奖）两种，
  与已实装三项的"折磨型"共同构成挑战判据。
- 实装、建榜、发版均需用户**当次**明说；本轮只设计、不落地。
