/* XHS-only copy registered in the authoritative i18n inventory.
 * Keep this extension scoped to the XHS package; Steam/Electron and TapTap
 * must not expose platform-specific appreciation UI. */
(function (root) {
  'use strict';

  var locales = root.ShellbreakLocales || (root.ShellbreakLocales = Object.create(null));
  var simplifiedChinese = Object.assign(Object.create(null), locales['zh-CN'] || {});
  simplifiedChinese['ui.xhs.reward.title'] = '支持作者';
  simplifiedChinese['ui.xhs.reward.open'] = '赞赏支持';
  simplifiedChinese['ui.xhs.reward.hint'] = '赞赏自愿进行，由小红书客户端处理。';
  simplifiedChinese['ui.xhs.reward.failed'] = '赞赏入口暂时不可用，请稍后再试。';
  locales['zh-CN'] = Object.freeze(simplifiedChinese);
})(window);
