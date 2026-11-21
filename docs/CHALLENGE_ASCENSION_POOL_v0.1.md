# 飞升系挑战 · 定案 v0.7

> 状态：**设计层，零生产代码改动、未跑 e2e、未建榜、未提交**。实装需用户当次明说「开始实装」。
> v0.7（15:46）：用户确认宇宙空洞「初始星屑」口径 ⇒ **掀幕后新一重的可消费余额**（`meta.stardust`），
> 意图「防止玩家飞升后没有一点星屑」。不进尤里卡 / 不做每秒产出 / 不写 `s.got.stardust`。§3.3 待确认块收敛为定案。
> 提出：2026-11-20 用户「再多设计几个」（承接旧「飞升竞速」`veil_rush` 一项已定稿）。
> v0.5（14:35）：用户「渊压飞升又是什么，删了呗」⇒ **渊压飞升 `abyss_ascend` 整稿删除**（`CHALLENGE_ASCENSION_SET_DESIGN_v0.1.md` 已删），
> 本稿所有对它的引用同步清除；飞升点通用奖励全局档数 12 → **9 档 ⇒ +90%**（`veil_rush` + 本稿两项，各 3 档）。
> v0.6（15:32）：用户「把宇宙空洞的奖励给飞升竞速；宇宙空洞奖励改成每次飞升初始给 20/40/60 星屑」⇒
> ①**飞升竞速 `veil_rush`** 奖励由星屑获取 +5/10/15% → **+10/20/30%**（见旧稿 v0.4）；
> ②**宇宙空洞 `veil_starve`** 单项奖励由「星屑获取 +10/20/30%」→ **「每次飞升初始给 20/40/60 星屑」**，
>   落点从 `stardustGain()` 乘区改为 `doVeil()` 起始奖励段加 `meta.stardust` 余额（§3.3 重写）。
> v0.2（12:25）：用户拍板——终点=**掀幕**（虚境飞升不算）、做 **A/B/D**（C 排除）、名称/数值/单项奖励授权我定、图标表我列给用户找 GPT 做。
> v0.3（14:00）：用户改名 **飞升苦旅 / 飞升竞速 / 宇宙空洞** → B 新名与旧稿 `veil_rush` 撞车（见旧 §2.0）。
> v0.4（14:10）：用户指令——①**删 B**（新「飞升竞速」`veil_sprint`），命名冲突随之消解；②**A/D 终点从「掀幕」改为「研成《掀起帘幕》」**；③确立原则「**这种以研成《掀起帘幕》为重点的挑战，飞升后不消失**」。
> ⇒ 两项终点统一走 `t:'tech'` **零插桩**；v0.2/v0.3 的 `t:'veil'` + `doVeil` 插桩整段**作废**（见 §3.0）。

## §2.0 命名冲突已消解（v0.4）

B（`veil_sprint`，v0.3 改名「飞升竞速」）已按用户指令删除。
本系列现仅存旧稿 **「飞升竞速」`veil_rush`**（`CHALLENGE_VEIL_RUSH_DESIGN_v0.1.md`），挑战页不再出现两个同名条目。
i18n key 仍建议按 id 派生，避免未来复用旧名时撞键。

## 1. 判据与口径（已拍板，不再待定）

- **挑战** = 可反复重玩 + 本局过程判定 + 可能失败；**成就** = 读累计 meta + 达成即锁 + 不会失败。
- **终点口径（v0.4 更新）= 研成《掀起帘幕》科技**（`s.techs.beyond_veil`，`techs.js:1100`），**不再是掀幕 `doVeil`**。
  ❌ 虚境飞升（`ascend_void` → `s.dysonDone`）**不算**——尽管现有 5 项终局挑战 goalText 写「达成虚境飞升亦算」，
  本系列不沿用那句话。
- 🔴 **"飞升后不消失"原则（v0.4 新增）**：以研成《掀起帘幕》为终点的挑战，玩家之后掀幕（飞升、重建本局）
  **不会丢失完成记录与永久奖励**。机制依据见 §3.0——这不是额外机制，而是科技终点方案的天然性质。
- 飞升数据全在 `meta.veil`（跨局累计）；`goalMet(s, goal)` 只读本局 `s`（`challenges.js:465`）——
  科技终点只读本局 `s.techs`，正好绕开这条约束。

## 2. 两项定案总表（B 已删）

| 代号 | id | 名称 | 终点 | 本局限制（三档） | 单项永久奖励（三档） |
|---|---|---|---|---|---|
| A | `veil_abyss` | **飞升苦旅** | 研成《掀起帘幕》 | 全产出 **−20 / −40 / −60%** | 全产出 **+20 / +40 / +60%** |
| D | `veil_starve` | **宇宙空洞** | 研成《掀起帘幕》 | 星屑结算收益 **−20 / −40 / −60%** | 每次飞升初始给 **20 / 40 / 60 星屑**（余额，非产出乘区） |

> id 保持不变（程序标识，与中文名无强绑定；改 id 会牵动白名单/存档登记，无必要）。
> 图标文件名按 id 命名（`challenge-veil-*`），同样不随中文名改。

> **通用奖励**（本系列已定、两项都吃）：每完成一档飞升挑战 **+10% 飞升点产出**。
> 落点 `ascensionTierCount(meta)` → `veilPeriod().points`（`prestige.js:389`），
> `ascMul = 1 + 0.1 × ascensionTierCount`。
> 全局飞升挑战 = 旧稿 `veil_rush`（3 档）+ 本稿两项（6 档）= **9 档 ⇒ +90%**。
> 渊压飞升 `abyss_ascend` 已删除（v0.5），不再计入。
> ⚠️ 绝不碰轮回点的 `challengePointMul`（`prestige.js:193`），两套货币两条账。

### 2.1 数值依据（用户授权我定，写明理由）

| 项 | 定案 | 依据 |
|---|---|---|
| A 飞升苦旅 | 全产出 −20/40/60% | 与深渊重压同幅度，**系列一致性**；终点改研成科技后赛程到 ERA11，仍是最长赛程 |
| A 奖励 | 全产出 +20/40/60% | 与降产对称，同系列惯例（深渊重压同款）；多项永久奖励叠加属既定惯例 |
| D 宇宙空洞 | 星屑 −20/40/60% | 幅度与系列统一；研成《掀起帘幕》硬门槛之一是**累计星屑 ≥1000**（`techs.js:1101 cond`），降它直接抬高研成难度，主题自洽 |
| D 奖励 | 每次飞升初始给 20/40/60 星屑 | 用户 15:32 指定（原「星屑获取 +10/20/30%」已转给飞升竞速）。是**余额直给**、非产出乘区，走 `doVeil()` 起始奖励段（§3.3）；数值沿用原档位序 20/40/60，标定权在用户 |

### 2.2 两项的区别（防止重复感）

| 挑战 | 终点 | 降产类型 | 单项奖励 |
|---|---|---|---|
| A 飞升苦旅 | **研成《掀起帘幕》** | 全产出 −20/40/60% | 全产出 +20/40/60% |
| 飞升竞速（旧稿） | 研成《掀起帘幕》·限时 | 32/16/8h | 星屑获取 +10/20/30%（v0.6 从宇宙空洞转入） |
| D 宇宙空洞 | **研成《掀起帘幕》** | 星屑 −20/40/60% | 每次飞升初始给 20/40/60 星屑（余额） |

A 与 D 降产类型不同（全产出 vs 星屑结算），主题与赛程感受有区分；同时只激活一个挑战，
降产分支不会叠乘，永久奖励按惯例叠加。
（原第三项渊压飞升 `abyss_ascend` 已于 v0.5 删除，其"破壳型短赛程热身"定位一并取消。）

⚠️ **语义变化（相对 v0.3）**：限制在**研成《掀起帘幕》那一刻结束**（`award()` 写 `s.challengeDone=true` ⇒ `active()` 返回 null，`challenges.js:253`），
不再像旧掀幕终点方案那样"挂到掀幕那一刻"。这是科技终点方案的正确语义——终点就是终点；
玩家研成后到掀幕前的最后一段不再受限，且此时挑战已完成落账（§3.0）。

## 3. 落地通道（两项终点统一，全部零插桩）

### 3.0 🔴 "飞升后不消失"机制（本轮核心，务必按此实现）

三处代码事实支撑这个性质——**不需要为它写任何新机制**，只要坚持科技终点方案：

1. **完成记录写在 meta，不在本局**：`award()` 在 `challenges.js:539` 写 `meta.challenges.completed[d.id] = tier+1`。
   `doVeil()` 的清场（`prestige.js:505` 一带）只清 `cycleTide / cycleStar / points / perks`，
   **不碰 `meta.challenges`** ⇒ 完成档位跨掀幕保留。
2. **永久奖励读 meta**：三项奖励都走 `tierDone(id, meta)`（meta 层），飞升后继续生效；
   `s.challengeDone` 是本局字段、重建后清零，但它**不是奖励真源**。
3. **判定早于掀幕**：`t:'tech'` 读本局 `s.techs.beyond_veil`。玩家研成科技的瞬间，
   主循环（下一帧 `game.js:1708` 的 `challenges.evaluate`）就判定完成并落账；
   此后玩家何时掀幕、`startRun()` 何时重建本局，都不影响已落账的完成与奖励。

⇒ 结论：**A/D 不需要任何 `doVeil` 插桩**。v0.2/v0.3 里为掀幕终点设计的
`{t:'veil'}` + `s.veilingNow` 旗 + doVeil ⑤后⑥前 evaluate 那一整套，**全部作废**。
这也顺带消掉了旧方案"完成面板弹出后立刻换局"的怪体验。

⚠️ 两个边界写清楚：
- **限时失败者**：本稿两项均非限时（无 `timed`）。若未来给某项加限时，超时则 `award()` 开头早退（`challenges.js:514`）不写账 ⇒ 飞升后仍无记录，符合"超时=失败"。
- **未开挑战的局**：研成科技但没开对应挑战，`s.challenge` 为空 ⇒ `award()` 在 `:508-509` 早退，不误发奖。

### 3.1 终点判定：新 goal 类型 `t:'tech'`（两项共用，只造一次）

- `goalMet()`（`challenges.js:465-493`）加一行：
  `if (goal.t === 'tech') return !!(s.techs && s.techs[goal.id]);`
  —— 只加分支，不改任何现有 goal 的求值。
- `goal.id = 'beyond_veil'`（`techs.js:1100`）。
- **判定触发**：`game.js:1708` 主循环每帧调 `challenges.evaluate(S, meta)` ⇒ 学成瞬间自动判定，零插桩。
- ⚠️ 现有 goal 类型全集（`challenges.js:465-493`）= all / built / res / dysonLaunchSites / dyson / annex / wonders，
  **无 tech**——这一行是新增，不是复用。

### 3.2 两项各自的限制落点

| 挑战 | 限制落点 | 关键约束 |
|---|---|---|
| A | `challenges.js:432 productionMul()` 加 `if (a && a.id === 'veil_abyss') m *= 1 - activeTier(s).cap` | 与 abyss 那行**并存各读各的**；该函数已接进 `economy.js` 六处产出通道，加一行即全局生效 |
| D | `prestige.js:632 stardustGain()` 的 `mul` 链加 `if (a && a.id === 'veil_starve') mul *= 1 - activeTier(s).cap` | 星屑是**破壳一次性结算**（`shell.js:295 breakReport` → `stardustGain`），不在实时产出链；破壳时 goal 型 `active()` 仍有效（`sealRun` 对 goal 返回 null、不置 `challengeDone`） |

### 3.3 两项各自的奖励落点

| 挑战 | 奖励落点 | 关键约束 |
|---|---|---|
| A | `productionMul()` 加独立一行 `tierDone('veil_abyss', meta)` → `1 + [0,0.2,0.4,0.6][tier]` | 不并进 abyss 那行（一次改一项） |
| D | 🔴 **v0.6 改**：不再走 `stardustGain()` 乘区，改挂 **`doVeil()` 起始奖励段**（`prestige.js:525-535`，现成通道，枯荣领域 `SB.voidFx.startStardust()` 就走这里）——掀幕重建本局后给 `meta.stardust += [0,20,40,60][tierDone('veil_starve', meta)]` | ①**每重掀幕都发一次**（用户原话「每次飞升初始给」），正好是该段的语义；②**只加 `meta.stardust` 余额，绝不写 `meta.stardustEarned`**——后者是排行榜「最多星屑」（`game.js:1458`）与尤里卡 seed 台账，红线同 `redeem.js:152-163`；③⛔ **不能再为 D 改 `doVeil()` 的话术边界**：§3.0/旧稿说「doVeil 全文逐字未改」，本项是**唯一例外**——但只加一段「读 tierDone 加余额」，不碰 `t:'veil'`、不碰 popup 顺序、不碰清场字段，可见行为与那套作废的插桩方案完全不同；④不并进 `challenges.js:393 stardustRewardMul`（九项共享）或 `prestige.js:649`（水体污染） |

> **v0.6 前 D 的奖励是 `stardustGain()` 乘区 ×[1,1.1,1.2,1.3]**——那档值（+10/20/30%）已整体转给飞升竞速 `veil_rush`（见旧稿 v0.4），
> D 自己换成余额直给。两条通道从此彻底分开，互不干扰。
>
> **✅ 口径已确认（v0.7，用户 2026-11-20 15:46）**：`meta.stardust` 在 `doVeil()` 里是**先清零再加起始奖励**（`:494` 清、`:533` 加），
> "初始给 20/40/60" = **掀幕后新一重手里握有的余额**（可拿去星屑商店消费），
> **不是**尤里卡进度、**不是**每秒产出、**不写** `s.got.stardust` 台账。
> 设计意图（用户原话）：**防止玩家飞升后一点星屑都没有**。此口径已拍死，实装照此，不再询问。

### 3.4 通用登记（两项都要，漏一处出 bug）

- **进度白名单 3 处**：`challenges.js:214` `emptyProgress()`、`state.js:73`、`state.js:946` 各加两个 id。
  漏登记 ⇒ 老档 `completed` 无键 ⇒ `tierDone` 恒 0 ⇒ 反复领奖。
- **`ascension:true` 标记**：两项定义都打上，供 `ascensionTierCount()` 计数（与旧「飞升竞速」`veil_rush` 同）。
- **本地成就**：`achv.js` 加两条定义；平台成就 ID 暂不建（用户拍板），`config.js:495` 映射暂不加。
- **i18n**：按 `AGENTS.md`，所有可见文案（名称/summary/rule/rewards/tier label/goalText）先登
  `outputs/.../i18n_text_inventory.xlsx` 给语义 key，代码引用 key 不写字面量。

## 4. 图标提示词表（给 GPT 出图用，我不调用生图）

统一风格约束（写进每条 prompt 前缀）：
`flat vector game achievement badge, centered symmetric composition, bold silhouette, limited palette of deep ocean blue / abyss teal / stardust gold, subtle glow, transparent background, no text, no letters, 512x512, suitable for a dark fantasy idle game challenge icon`

| 挑战 | 建议文件名（按 id，不随中文名改） | 画面主体（中文说明） | 英文 prompt 主体 |
|---|---|---|---|
| A 飞升苦旅 | `challenge-veil-abyss-illustrated.png` | 一具被向下重压的潜水员剪影，头顶悬着厚重的天壳与垂落的帘幕，脚下是深渊涡流，表现"负重远行" | `a lone deep-sea diver silhouette bearing the weight of a colossal ceiling, a heavy veil curtain overhead, abyssal whirlpool below, arduous journey motif` |
| D 宇宙空洞 | `challenge-veil-starve-illustrated.png` | 一只干涸的星屑之瓶倒置，仅剩几粒金色星尘坠落，背景是枯竭的星空与一道半掀的帘幕 | `an inverted drained stardust vial with only a few golden particles falling, a withered starfield behind, a half-lifted veil curtain` |

> 出图后放 `assets/challenges/`，文件名去 `-illustrated` 亦可（现有两种命名都有）。
> ⚠️ 两张图风格必须统一（同一 prompt 前缀）；若 GPT 出的图带文字/字母，需重做。
> B（`challenge-veil-sprint-illustrated.png`）随 B 项删除，不出图。

## 5. 验收清单（实装后逐条勾）

- [ ] `DEFINITIONS` 含 `veil_abyss` / `veil_starve`，均为 `goal.t === 'tech'`、`goal.id === 'beyond_veil'`、无 `timed`；虚境飞升（`dysonDone`）**不触发**本系列。
- [ ] **终点判定**：学成《掀起帘幕》瞬间即结算（`s.techs.beyond_veil` 置位后的下一帧 evaluate），完成面板正常弹出。
- [ ] 🔴 **飞升后不消失（核心）**：研成后完成档位写入 `meta.challenges.completed`；随后掀幕 `startRun()` 重建本局，档位不丢、永久奖励继续生效、成就不丢。
- [ ] **零插桩（v0.6 有唯一例外）**：`goalMet()` 只有新增的 `tech` 分支，现有 goal 求值未变；`doVeil()` 仅允许为 D 加一段「起始星屑余额」（§3.3），**无** `veilingNow`、**无** `t:'veil'`、不动 popup 顺序与清场字段。
- [ ] 限制结束时机：研成瞬间 `active()` 返回 null ⇒ A 全产降 / D 星屑降在研成那刻结束，不是掀幕那刻。
- [ ] 通用奖励：全局 9 档 ⇒ `ascMul` 满值 1.9（本稿 6 档 + 旧稿 `veil_rush` 3 档）；飞升点「预估 == 实发」（四处同源）。
- [ ] 单项奖励：A 全产出乘区独立行；飞升竞速星屑乘区独立行（+10/20/30%，`stardustGain`）；D 起始星屑余额（`doVeil` 段 `meta.stardust += [0,20,40,60][tier]`）——`stardustRewardMul`（九项）/`prestige.js:649`（水体污染）与其他 8 项读数逐字未变。
- [ ] 🔴 **D 起始星屑不污染台账**：`meta.stardustEarned` / `game.js:1458` 排行榜「最多星屑」读数、`s.got.stardust` 尤里卡 seed 均不因 D 变化（只加余额，红线同 `redeem.js:152-163`）。
- [ ] D 起始星屑按重发：连续掀幕 2 次，每次都发当前档位的 20/40/60，不是只发一次、也不是累积叠乘。
- [ ] 白名单 3 处齐全：老档读入 `tierDone` 正常，不重复领奖。
- [ ] 重打：全通后重打只刷榜/不重复发奖（`award()` 的 replay 分支不写账本）。
- [ ] 文案全走 i18n key，无新增字面量；TapTap 构建恒 zh-CN。
- [ ] 命名冲突已消除：挑战页只有一个「飞升竞速」（旧稿 `veil_rush`）。

## 6. 纪律确认

- 本稿零 `src/` 改动、零回归、零榜单/成就创建、零提交、零生图调用。
- 数值由我按 §2.1 推导而定（用户授权）；如需调整只改数值不动结构。
- 建榜 / 平台成就 ID 沿用本系列「暂不建」，除非用户当次明说。
- 实装、建榜、发版均需用户**当次**明说；实装前按项目纪律，跑 e2e 前再确认一次。
