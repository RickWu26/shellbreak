# Steam 排行榜后台填写单

应用：渊海群星：深海文明建设（App ID `5568210`）

Steamworks 后台 **统计与成就 → 排行榜** 已创建下列 12 个排行榜。`Name` 是程序查找用的内部名；`Community Name` 是 Steam 社区展示名。

## 已创建的榜单配置

| 游戏内榜单 | `Name`（程序查找名） | `Community Name` | Sort Method | Display Type | Writes | Reads | Steam Leaderboard ID |
|---|---|---|---|---|---|---|---|
| 最快凿穿冰壳 | `shellbreak_fastest_ice_shellbreak` | Fastest Ice Shellbreak | Ascending | Seconds | Untrusted | Everyone | `21623489` |
| 最快立教 | `shellbreak_fastest_faith` | Fastest Faith Founded | Ascending | Seconds | Untrusted | Everyone | `21623494` |
| 综合发展分 | `shellbreak_development_score` | Highest Development Score | Descending | Numeric | Untrusted | Everyone | `21623495` |
| 入藏奇观 | `shellbreak_legacy_wonders` | Most Legacy Wonders | Descending | Numeric | Untrusted | Everyone | `21623496` |
| 轮回次数 | `shellbreak_prestige_count` | Prestige Count | Descending | Numeric | Untrusted | Everyone | `21623515` |
| 最多星屑 | `shellbreak_stardust` | Most Stardust | Descending | Numeric | Untrusted | Everyone | `21623518` |
| 最多轮回点 | `shellbreak_prestige_points` | Most Prestige Points | Descending | Numeric | Untrusted | Everyone | `21623520` |
| 最快建立戴森球 | `shellbreak_fastest_dyson_sphere` | Fastest Dyson Sphere | Ascending | Seconds | Untrusted | Everyone | `21623521` |
| 最快虚境飞升 | `shellbreak_fastest_verge_ascension` | Fastest Verge Ascension | Ascending | Seconds | Untrusted | Everyone | `21623522` |
| 最快流浪启程 | `shellbreak_fastest_wandering_terra` | Fastest Wandering Terra Launch | Ascending | Seconds | Untrusted | Everyone | `21623523` |
| 最快星海竞速 | `shellbreak_fastest_starsea_race` | Fastest Starsea Race | Ascending | Seconds | Untrusted | Everyone | `21623524` |
| 最低污染通关 | `shellbreak_lowest_pollution_clear` | Lowest Pollution on Completion | Ascending | Numeric | Untrusted | Everyone | `21623525` |

## 提交规则

- 游戏提交成绩时使用 Steam 的 `Keep Best`：时间榜保留更短时间，递增分数榜保留更高分，污染榜保留更低值。
- `Writes` 选 **Untrusted**（允许游戏客户端上传）；不要选 Trusted。Trusted 需要可信服务器和 Steam Web API 发布者密钥，本项目不会把密钥放进玩家包体。
- `Reads` 选 **Everyone**，这样游戏内可读全服榜和好友榜。选 Friends 会限制客户端只能读取好友成绩。
- 保留 `Community Name`，便于榜单也显示在 Steam 社区页。展示名可改文案，但不要改 `Name`。
- 榜名、排序和显示类型创建后不要随意更改；尤其不要把时间榜设成毫秒。游戏现有计分按整秒提交。
- Steamworks 当前显示 `Reads: -`、`Writes: -`，分别代表不限读取（Everyone）与非可信写入（Untrusted）；已逐项核对。包体通过上面的 `Name` 查找榜单，不需要回填数字 ID。TapTap 的榜单 ID 和成绩不会迁移到 Steam。

## 完成后核对

- [x] 12 个榜单都已创建，`Name` 和 `Community Name` 与表格一致。
- [x] 排序和显示类型与表格一致。
- [x] 全部为 `Writes: Untrusted`、`Reads: Everyone`。
- [x] Steamworks 榜单配置已保存并立即生效。
- [ ] 用 Steam 客户端测试成绩上传、全服榜/好友榜读取与游戏内显示。

这个选择允许玩家客户端提交成绩，单机排行榜无法防止篡改。Steam 客户端仍会执行上传频率限制；包体会合并待提交的同榜成绩并排队发送。
