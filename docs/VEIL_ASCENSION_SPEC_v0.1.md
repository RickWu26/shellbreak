# 帷幕之后 · 飞升系统规格 v0.1（掀幕之后那一层）

> 状态：**设计稿 / 待拍板**，初稿 2026-11-14，**修订 2026-11-16**（终极科技更名《掀起帘幕》+ ERA11 纪元名 α + 尤里卡改本周期星屑 ≥1000，详见上位稿 §0 #7–#9）。
> **本稿未改任何生产代码**，未跑回归、未跑 balance / 参数扫描、未 commit / 封包 / 上传。
> 上位文档：`docs/ERA11_VEIL_SPEC_v0.1.md`（ERA11、掀幕入口、清零边界、#4 星屑口径）。
> 本稿负责回答「**掀开帷幕之后玩家玩什么**」：二层货币、飞升树、循环闭合、账本、UI、验收。
> 边界：ERA12 天灾本期不做；局内三选一飞升路径已作废（用户拍「覆盖」）。

---

## 0. 一句话

飞升 = **二层 prestige**：把一层攒的轮回点 / 星屑 / 两棵树全部清零，换「帷幕点」，买一棵**本重有效、每重重买**的飞升树，带着它的加成从 ERA1 重跑，直到再次学会《掀起帘幕》（尤里卡 = 本周期累计星屑 ≥ 1000）、再掀一次。

本作由此从「一层轮回 + 线性树」变成两层：**一层周期 = 一局；二层周期 = 若干局 + 一次掀幕**。

---

## 1. 掀幕之后发生什么（玩家视角，8 步）

| 步 | 玩家看到 / 系统做 |
|---|---|
| 1 | **轮回按钮下方**出现「掀起帘幕」按钮 + 右侧预估文字（条件 `s.techs.beyond_veil`，见上位稿 §6 #10） |
| 2 | 点开 → **重置预览**面板：明写「将得 N 帷幕点」+ 将失去 / 将保留清单 + 「第 K 重帷幕」 |
| 3 | 确认 → `doBreak(silent)` 先把**当前这一局**结算掉（否则本局收益凭空消失） |
| 4 | 按本周期累计算帷幕点 → 原子清零（`spent += tide; tide = 0`，见上位稿 §3.2） |
| 5 | **创建 `meta.veil` 账本**：`count++`、`points = N`、`perks = {}`、周期累计归零 |
| 6 | `startRun()` → 从 ERA1 重开；本局 `s.got.stardust` 按 #4 口径 A 归零 |
| 7 | **自动打开飞升树**（或底栏高亮入口），首层两个节点立刻可点 |
| 8 | 点「退潮之赐 / 残星之赐」→ **当场**到账轮回点 / 星屑，马上去一层树消费 ⇒ 软着陆 |

**硬约束**：第 5 步必须在第 6 步之前。`freshRun → derivePerksFromMeta()` 会读 `meta.veil`，且 #4 的「账本是否存在」判据也靠它；顺序反了会开出「有飞升点但树不认」的坏局。

---

## 2. 账本与入账（承接上位稿 §3，补两处新坑）

### 2.1 首层发轮回点：必须走三字段入账（硬阻塞）

`redeem.js:139-149` 的定损方程是 `tide = tideEarnedTotal − spent + 10M`，`credit()` 同时写
`tide` / `tideEarnedTotal` / `compensationTotal`。飞升树首层节点要发 `meta.tide`，
**只写 `tide` 不写 `tideEarnedTotal` 就会让残差变负**，补偿判「又丢了 N 点」⇒ 重复补发且不可回收。

验算（忽略两边同消的 10M 常数）：

```
清零前：E − T₀ − S = 0
清零：  spent += T₀, tide = 0        ⇒ E − 0 − (S + T₀) = 0        ✓
发 X：  E → E+X, tide → X            ⇒ (E+X) − X − (S + T₀) = 0    ✓
```

**待拍**：飞升树发放是否计入 `compensationTotal`。语义上它是游戏内产出、不是礼包补偿，
建议**不计**（新增 `grantTide(m,n)` 只写 `tide` + `tideEarnedTotal`），但必须与补偿对账探针一起验。

### 2.2 首层发星屑：照 `creditStar()` 口径

`redeem.js:161-164` 的 `creditStar()` 只写 `m.stardust` + 置 `stardustShopUnlocked = true`，
**刻意不写 `stardustEarned`**（那是「累计结算获得」，同时喂排行榜与 `s.got.stardust` 尤里卡）。
飞升树发的星屑是赠送、不是结算产出 ⇒ **照抄这个口径**，正好与 #4「历史只记账」一致，
不会把软着陆的星屑混进终身统计。

### 2.3 「当局就要获得」不能做成 `give`

`TIDE_TREE.give` 是**每局开局给一次**（`state.js:265` 的 `out.give`、`prestige.js:515` 的 `applyPerk`）。
若二层首层照抄，买一次之后**每局重复发币** ⇒ 无限刷。

本稿口径：首层两节点用新字段 `grant`（发放 meta 货币），**购买时一次性入账**，
以 `veil.perks[id]` 等级作幂等哨兵（`buyVeilPerk` 内按「本次购买前等级」决定是否发放、发几份）。
即用户原话「一开始就要能点、而且当局就要获得」= 掀幕后立刻开始的这一局、当场到账、不隔一次轮回。

### 2.4 防套利

帷幕点只能由**掀幕**获得，而掀幕必然清零并归零周期累计 ⇒ 无法「买节点 → 掀幕 → 再买」刷点。
但仍需两条护栏：① 首层 `grant` 每级发放量 < 该级价格的等价收益（数值待标定）；
② `veil.points` 只允许 `buyVeilPerk` 扣减，不开放兑换 / 赠送通道。

---

## 3. 帷幕点

**来源**：`veil.cycleTide` / `veil.cycleStar`（本周期累计），只在 `doBreak` 结算时累加：
- `cycleTide += r.tidePoints`（`prestige.js:199` 的结算值，与 `meta.tide += r.tidePoints`（`:251`）同源）
- `cycleStar += _sd`（`prestige.js:297-300` 的 `_sd`，与 `meta.stardustEarned += _sd` 同一事务同值）

**公式**（2026-11-16 用户拍板，替换原对数占位式）：

```
points = round( cycleTide / 10000 + cycleStar / 1000, 2 )
```

| 项 | 作用 |
|---|---|
| 轮回点项 | 每 1 万轮回点 = 1 点；`cycleTide` 跨数量级时点数线性增长 |
| 星屑项 | 每 1 千星屑 = 1 点；与《掀起帘幕》尤里卡（周期星屑 ≥1000）同源——**刚够学会科技 = 至少 1.00 点** |
| 不取整 | **保留两位小数**（用户拍），两项余数都作数；原 `floor` + 保底 `G` 的占位设计作废 |
| 负项 | 无。两个加数都 ≥ 0，首掀幕必得 ≥ 1.00 点（因科技门槛已强制星屑 ≥1000） |

**防刷三条**：① 只用周期增量，掀幕归零；② 只在「确认掀幕」那一刻算一次并写 `veil.points`，**不逐帧写入**（`#veilHint` 的预估只是只读展示）；③ 终身统计（历史 tide / 星屑、`veil.lifetimePoints`）只做展示与榜，绝不参与公式。

⚠️ UI 预估与结算必须**同源同函数**：`estimateVeilPoints(s)` 一处实现，`#veilHint` 显示与确认面板「将得 N 点」与最终 `veil.points` 都调它，避免「显示 1.23 实发 1.20」的对不上账。

**注意**：「记录历史获得的轮回点和星屑」由 `tideEarnedTotal` / `stardustEarned` 承担，它们**不清**（上位稿 §2）；`cycleTide/cycleStar` 是另一套周期账，两者不要混用一个字段。

---

## 4. 循环闭合：第二重为什么比第一重快

一个**二层周期**不是一局，而是：

```
掀幕 → 若干次一层轮回（每局结算喂 cycleTide/cycleStar） → 本周期星屑累计满 1000 → 再次学到《掀起帘幕》→ 再掀幕
```

加速链：

```
飞升树节点 → 每次轮回更快 / 结算 tide·星屑更多 → 本周期累计更大 → 下次掀幕点数更多
           → 能买更多 / 更深的节点 → 下一周期更快
```

支撑这条链的三件事：

1. **周期内可多次轮回**：`cycleTide` 是周期内所有 `doBreak` 的累加，不是单局值。
2. **深度按 `veil.count` 永久开放**：节点带 `unlockAt` 字段，第 1 重只能买 layer 1 与部分 layer 2，
   第 2 重放开「潮律通汇 / 阈门」，第 3 重放开「余响」。**重买的是等级，永久扩的是可买范围** ⇒
   每重都有新目标，不是重复劳动。`count > 3` 后不再扩（内容边界，日后要扩只加表行）。
3. **已知例外顺带发力**：`meta.cycle` 不清（上位稿 §8），`dyn:'loop5'` 一类按总轮回数给的加成
   会随层数自然增长。这是第二重更快的额外来源，不额外处理，也不再叠加新的乘区。

**反滚雪球硬约束**：
- 飞升树**不设 `n: Infinity` 尾节点**（`starInfinite` 那种无限级 + 二层会指数叠加）。
- 潮律组两条结算倍率设**合计硬顶**（`Math.min(cap, sum)`，`cap` 待标定）。
- 所有效果走**加法轴**；`veilTideYield` / `veilStarYield` 是两条新读点，**不是新乘区**：
  前者加算进 `pointMul` 的括号、后者独立相乘一行（照 `stardustGain():404-409` 的「独立相乘、
  不并进上面任何一行」纪律），绝不进 `globalMul` / `legacy()`。

---

## 5. `VEIL_TREE` 完整节点表

### 5.1 字段契约

照 `TIDE_TREE`（`config-catalog.js:17-176`）的 `id / name / subtree / layer / cost / costs / n / apply / nest / nests / desc`，
新增两个字段：

| 字段 | 含义 |
|---|---|
| `grant` | `{tide: X}` 或 `{stardust: Y}`：**购买时一次性入账 meta 货币**，幂等哨兵 = `veil.perks[id]` |
| `unlockAt` | 需要 `veil.count >= N` 才可见可买（默认 1）。只控制可买范围，**掀幕时不清** |

导出 `NS.VEIL_TREE = VEIL_TREE`（照 `:433-434`）。

### 5.2 节点表（23 个 · 5 组）

**成本符号**：`C1 < C2 < C3 < C4 < C5`，绝对值与比例**全部待标定**。
**效果数值**：均为**提议档位 / 结构占位**，未标定，不得据此改代码。

#### 组 1 · 溯洄 `emergence`（软着陆 · layer 1 · `unlockAt:1`）

| id | 名称 | n | cost | 效果 | 到账 |
|---|---|---|---|---|---|
| `veilTideGrant` | 退潮之赐 | 3 | C1 | `grant:{tide: G1}` / 级 | 购买当场 |
| `veilStarGrant` | 残星之赐 | 3 | C1 | `grant:{stardust: G2}` / 级 | 购买当场 |
| `veilHeadStart` | 溯洄行装 | 1 | C2 | `apply:{startPop:2, matStore:2}`（现成键） | 当场 `applyPerk` |

> 首层两节点价各 C1，保底 `G >= 2×C1` ⇒ 掀幕后必定点得起，满足「一开始就能点」。

#### 组 2 · 潮律 `tideflow`（循环加速核心 · 新读点只在这里）

| id | 名称 | n | cost | nest | unlockAt | 效果（提议档位） |
|---|---|---|---|---|---|---|
| `veilTideYield1` | 回潮 I | 1 | C2 | — | 1 | 一层轮回点结算 +10% |
| `veilTideYield2` | 回潮 II | 1 | C3 | `veilTideYield1` | 1 | 再 +10% |
| `veilStarYield1` | 星汛 I | 1 | C2 | — | 1 | 一层星屑结算 +10% |
| `veilStarYield2` | 星汛 II | 1 | C3 | `veilStarYield1` | 1 | 再 +10% |
| `veilTideYieldTail` | 潮律通汇 | 3 | C4 | `veilTideYield2` | 2 | +5% / 级 |
| `veilStarYieldTail` | 星汛通汇 | 3 | C4 | `veilStarYield2` | 2 | +5% / 级 |

> 两条新键 `veilTideYield` / `veilStarYield` 进 `emptyPerks()`；读点各一处，见 §6.2。

#### 组 3 · 层积 `strata`（局内产出 · **全部复用现成 `s.perk` 键 = 零新公式**）

| id | 名称 | n | cost | apply（现成键） | unlockAt |
|---|---|---|---|---|---|
| `veilAlgae` | 渊耕 | 1 | C2 | `algaeCrop: 2` | 1 |
| `veilCraft` | 渊铸 | 1 | C2 | `craftQuota: 2` | 1 |
| `veilScholar` | 渊思 | 1 | C2 | `scholarPact: 2` | 1 |
| `veilScribe` | 渊录 | 1 | C2 | `scribePact: 2` | 1 |
| `veilMatStore` | 渊藏 | 1 | C2 | `matStore: 2` | 1 |
| `veilShellDrive` | 渊凿 | 1 | C3 | `shellDrive: 1` | 2 |
| `veilWorkSpeed` | 渊勤 | 1 | C3 | `workSpeed: 0.10` | 2 |

#### 组 4 · 阈门 `threshold`（门槛减免 · 复用现成键，不碰纪元 key 门槛）

| id | 名称 | n | cost | apply（现成键） | unlockAt |
|---|---|---|---|---|---|
| `veilShellSurvey` | 阈测 | 1 | C4 | `shellSurvey: 4` | 2 |
| `veilThin` | 阈薄 | 1 | C4 | `thin: 1` | 2 |
| `veilWonderCut` | 阈构 | 1 | C5 | `wonderBlueprint: 2` | 3 |

> **注意**：`eraProgress` / `keysOf` / `key:true` 那套纪元推进判定（上位稿 §7 硬阻塞区）一律不碰。
> 阈门只削成本与壳厚，不动「哪些科技算 key」，否则又会出现老档瞬跳。

#### 组 5 · 余响 `remnant`（便利与长线）

| id | 名称 | n | cost | apply（现成键） | unlockAt |
|---|---|---|---|---|---|
| `veilAutoStudy` | 余响 · 自转 | 1 | C4 | `autoStudy: 1` | 2 |
| `veilAutoCivic` | 余响 · 议转 | 1 | C4 | `autoCivic: 1` | 2 |
| `veilSlotSci` | 余响 · 席位 | 1 | C5 | `slotSci: 1` | 3 |
| `veilSlotCraft` | 余响 · 工位 | 1 | C5 | `slotCraft: 1` | 3 |

> `autoStudy` / `autoCivic` 复用现成开关语义（`prestige.js:523-532`），
> 开关状态 `meta.autoResearch` **跨周目保留、掀幕不清**（上位稿 §2 保留列）。

### 5.3 数值纪律

- 表中所有 `C*`、`G*`、`+10%`、`+5%`、`apply` 数值**都是结构占位 / 提议档位**，标定权在用户。
- 成本只按**层与稀有度**排相对序（软着陆最便宜、通汇 / 席位最贵），不预设绝对值。
- 不跑 `sim/balance.mjs`（已删，任何形式都不许跑）；单局总时长 / 8–14h 窗最后统一算。

---

## 6. 购买与派生（参数化复用，不复制第二套状态机）

### 6.1 状态机

`prestige.js` 现有 `perkNextCost(p,lv)`（`:331-354`，`costs`/`scale`/`cost` 三态）、
`perkPrerequisites(p)`（`:355`）、`perkLocked(p)`（`:365`）、`perkState(id)`（`:370`）、
`buyPerk(id)`（`:483`）全部**读死 `meta.perks` / `meta.tide`**。

**做法**：把这四个函数**参数化**（`perkState(id, table, levelsMap, walletKey)` 之类），
一层树传 `TIDE_TREE / m.perks / tide`，星屑树传 `STAR_PERKS / m.starPerks / stardust`，
**飞升树传 `VEIL_TREE / m.veil.perks / veil.points`**。

**理由**：复制一套 `veilPerkState` 会出现「改了一处价格规则、另一处没跟」的分叉，
正是项目里 `metOf` 三档兜底那条教训。`perkLocked` 额外叠加 `unlockAt` 判据。

`buyVeilPerk(id)` 事务顺序：

```
state = veilPerkState(id)             // done / locked(unlockAt) / afford
if (!ok) return false
meta.veil.points -= state.next
meta.veil.perks[id] = state.lv + 1
if (p.grant) grantTide/grantStar(meta, p.grant, 本次购买份数)   // 幂等，见 §2.3
if (p.apply) applyPerk(SB.game.run(), p)                        // 当场写 s.perk
saveMeta(meta)
```

### 6.2 派生与效果挂点

| 挂点 | 改动 |
|---|---|
| `state.js:150 derivePerksFromMeta()` | 在 `TIDE_TREE` / `STAR_PERKS` 两段循环后加**第三段**读 `m.veil.perks`，纯加法写 `s.perk`。`unlockAt` 不参与派生（只管可买性），避免老档读档掉效果 |
| `state.js:94 emptyPerks()` | 加 `veilTideYield`、`veilStarYield` 两个键（新键仅此两个） |
| `prestige.js:193 pointMul` | 二层 tide 倍率**加算进括号**：`1 + challengeCompletions*0.1 + veilTideYield`，不另起乘区 |
| `prestige.js:392 stardustGain()` | 二层 star 倍率**独立相乘一行** `mul *= 1 + veilStarYield`（照 `:404-409` 纪律，不并入 `(1+starPct)*(1+0.5*dysonPct)`） |
| 两处合计硬顶 | `Math.min(cap, ...)`，`cap` 待标定 |

**注意**：`applyPerk()` 的 `dyn:'loop5'` 读 `meta.cycle`、`n:Infinity` 的 `effectScale` 读 `starInfinite`（`:505-513`）。
VEIL_TREE **不使用** `dyn` / `mode:'max'` / `n:Infinity` / `give` / `recipe` 这五类特性，
避免与 `cycle` 保留例外及 `starInfinite` 叠加纠缠。

### 6.3 存档字段

```
meta.veil = null                     // 未掀幕：emptyMeta() 里必须是 null，不预置对象
// 掀幕后：
{
  count: 1,                          // 第几重，只增不清
  points: 0,                         // 帷幕点余额
  perks: {},                         // 本重已购等级，掀幕时清空（#3 重买）
  cycleTide: 0, cycleStar: 0,        // 本周期累计，doBreak 累加、掀幕归零
  lifetimePoints: 0                  // 终身总得点，只展示 / 榜，不参与公式
}
```

- `normalizeMeta()`（`state.js:727`）收口：`veil === null` 或对象，对象时逐字段校验类型与下限。
  **不能**把 `null` 换成默认对象，否则 #4「账本是否存在」判据对老档失效（上位稿 §4.3）。
- `state-migrate.js` 不动（meta 走 `normalizeMeta`，run 侧 `out.got` 只借键列表）。
- `hasProgress`（`state.js:877`）加一条 `m.veil !== null`：掀幕后所有余额归零，
  若仍只看 `tide / layers / cycle` 可能误判「无进度」⇒ 触发三态扫描「不确定一律不开新局」。

---

## 7. UI

| 件 | 落点 | 纪律 |
|---|---|---|
| 树面板 | `render-pane-meta.js` 新增 section，复用 `talentTreeMarkup({anchorId, nodes, layout:'layered'})`（`:279-285`）；`trees` 加 5 组 | 门控 = `meta.veil !== null`；未掀幕**整块不渲染**，避免玩家困惑 |
| 节点属性 | `attr: 'data-veil-perk="id"'`（照 `:275` 的 `data-perk`） | `input.js:875-885` 的 `closest()` 加第三支 → `buyVeilPerk`。**必须走 closest**，直读 dataset 是已修过的静默 bug |
| 重置预览 | 掀幕按钮先弹确认面板 | 明写：将得 N 点 / 将清空（轮回点、星屑、两棵树、四项旧日遗产、本局）/ 将保留（成就、挑战、兑换码、轮回次数、商店解锁、自动研究开关）/ 第 K 重 |
| 掀幕后引导 | `startRun` 后自动打开飞升树或底栏高亮入口 | 否则玩家有帷幕点却不知道去哪花（与 `shopUnlocked` 死局同类） |
| 按钮落点 | `index.html` 轮回 `.foot` 下方新增一行：`#btnVeil`（掀起帘幕）+ `#veilHint`（预估） | 与 `#btnBreak` 同属静态行，绝不放进每帧重画容器；显示条件 `s.techs.beyond_veil` |
| 状态展示 | `#veilHint` 显示 `当前掀幕预估：N.NN 飞升点（本周期 X 轮回点 + Y 星屑）`；面板另显示「第 K 重帷幕 / 飞升点余额 / 本周期累计 tide·星屑」 | 预估**只展示不写状态**；公式只在确认掀幕那一刻算；与结算同源 `estimateVeilPoints()` |
| 文案 | 先登 `src/locales/zh-CN.js` 再写 UI | 非琐碎 UI 先做 demo 再实装；退休 key 永不复用；TapTap 只 zh-CN |
| 缓存版本 | 改过的 js / css 各自 `?v` bump + `_repack.py` 版本断言 | 发布动作，等用户当次明说 |
| 美术素材 | `docs/VEIL_ART_PROMPTS_v0.1.md`（Gemini 提示词 + 素材规范）；demo `tmp/veil-panel-demo.html`，一键复制页 `tmp/veil-art-prompts.html` | 图只承担材质与光；文字 / 数值 / 状态 / 昼主题 / 封缄全走 DOM + CSS，**永不烧进贴图**；最小 4 张（1 总底 + 3 门体） |

---

## 8. 必拆的门（漏一处 = 买了没效果 / 永远见不到）

1. `derivePerksFromMeta()` 第三段循环 —— 不拆则买完节点 `s.perk` 不变。
2. 状态机参数化 —— 不拆则要复制第二套，价格规则必然分叉。
3. `input.js` 委托加 `data-veil-perk` 且走 `closest()` —— 不拆则节点「能看不能点」。
4. `prestige.js:193` 与 `:392` 两条结算倍率读点 —— 不拆则潮律组整组是死节点。
5. `emptyPerks()` 加两键 —— 漏键会让 `s.perk.veilTideYield` 为 `undefined`，读点按 0 兜底但语义含混。
6. `hasProgress` 加 `veil !== null` —— 不拆则掀幕后可能误触三态扫描。
7. AI bot：`ai-player.js:123-148` 只买一层树，掀幕后要能买 `VEIL_TREE`（否则自动化玩家永远不点）。
8. 上位稿 §7 的 4 处门（ERA10 零 key、bot 在 `dysonDone` 后收手、老档补揭示、市政空纪元）一并生效。

**已知例外**（不改）：`meta.cycle` 保留 ⇒ `loop5` 类加成仍在发力；`stardustEarned` 保留作终身统计但不再 seed 进 `s.got.stardust`（#4 口径 A）。

---

## 9. 验收判据（分期，不估工期）

| 期 | 交付 | 验收 |
|---|---|---|
| **P0 骨架** | 账本 + 事务 + 参数化状态机 + 派生第三段 + 树面板 demo + 重置预览 | 掀幕→`startRun` 成功；`veil` 账本在 `startRun` 前创建；老档（无 veil）行为零变化；定损残差不变 |
| **P1 内容** | 23 节点全表 + `grant` 首层 + 潮律两读点 + `unlockAt` | 掀幕后首层两节点当场到账且 `tideEarnedTotal` 同步；`s.got.stardust = 0`；连点掀幕不刷点；第 2/3 重按 `count` 放开节点 |
| **P2 闭环** | 潮律倍率 + 硬顶 + bot 买二层树 | 跑完两个完整二层周期，第二周期 `cycleTide` 明显大于第一周期（**只验方向，不标定数值**）；bot 能自行买到结算 |
| **P3 验证** | e2e 新 suite + 数值标定（用户拍板后）+ 版本四件套 | e2e 按失败清单 comm 对比零新增、连跑 3 次看分布（0xC0000005 崩溃遍不作结论）；`?v` bump 与 `_repack.py` 版本断言 |

**回归纪律**：唯一回归 = `node --max-old-space-size=8192 sim/e2e.mjs`；单次红绿不是结论。
**发布纪律**：commit / push / 上传 / 建榜 / 封包一律等用户当次明说。

---

## 10. 待拍清单

| # | 事项 | 建议 |
|---|---|---|
| 1 | 节点表 23 个 / 5 组是否定稿（增删节点、组名） | 定稿后只改表行，不动引擎 |
| 2 | `C1..C5`、`G1/G2`、`A/B/T0/S0/G`、两条倍率硬顶 | **全部待你标定**，本稿只给结构与相对序 |
| 3 | 首层 `grant` 发放是否计入 `compensationTotal` | 不计（新增 `grantTide` 只写 tide + E） |
| 4 | `unlockAt` 三档（1/2/3）节奏 | 先按 3 重封顶，日后扩只加表行 |
| 5 | 掀幕后自动弹树 vs 底栏入口 | 自动弹（防「有点没处花」） |
| 6 | 飞升树是否要新排行榜（第几重 / 终身点） | 本期不做；需平台建 ID，属发布动作 |
| 7 | **整个设计是否算「做完」** | 本稿 + 上位稿 = 完整两套；确认后等你当次明说「开始实装」 |

---

> 本稿只定**结构与落点**：所有倍率、成本、系数、时长一律占位，标定权在用户。
> 未改任何生产代码，未跑回归 / 标定，未 commit / 封包 / 上传。
