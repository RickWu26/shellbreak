/* Optional XHS appreciation entry. The platform publish switch must be
 * confirmed before rewardAuthorEnabled is set in xhs-platform.js. */
(function (root) {
  'use strict';

  var MINIMUM_CLIENT_VERSION = 9533;

  function text(key) {
    return root.SB && root.SB.i18n && root.SB.i18n.t
      ? root.SB.i18n.t(key)
      : '';
  }

  function buildVersion(options) {
    var env = options && options.miniToolEnv;
    return Math.floor((Number(env && env.buildVersion) || 0) / 1000);
  }

  function clientVersion() {
    var xhs = root.xhs;
    var current = buildVersion(xhs && xhs.launchOptions);
    if (current) return Promise.resolve(current);

    var miniTool = xhs && xhs.miniTool;
    if (!miniTool || typeof miniTool.getLaunchOptions !== 'function') {
      return Promise.resolve(0);
    }

    return Promise.resolve().then(function () {
      return miniTool.getLaunchOptions();
    }).then(buildVersion, function () { return 0; });
  }

  function createElement(tagName, className, key) {
    var node = root.document.createElement(tagName);
    if (className) node.className = className;
    if (key) {
      node.setAttribute('data-i18n', key);
      node.textContent = text(key);
    }
    return node;
  }

  function mount() {
    var platform = root.shellbreakPlatform;
    if (!platform || platform.runtime !== 'xiaohongshu' || platform.rewardAuthorEnabled !== true) return;

    var xhs = root.xhs;
    var miniTool = xhs && xhs.miniTool;
    if (!miniTool || typeof miniTool.rewardAuthor !== 'function') return;

    var popover = root.document.querySelector('.ui-settings-popover');
    if (!popover || root.document.getElementById('xhsRewardBlock')) return;

    var block = createElement('div', '', null);
    block.id = 'xhsRewardBlock';
    block.hidden = true;

    block.appendChild(createElement('div', 'ui-settings-title', 'ui.xhs.reward.title'));

    var actions = createElement('div', 'ui-settings-actions', null);
    var button = createElement('button', 'ui-setting-btn', 'ui.xhs.reward.open');
    button.type = 'button';
    button.setAttribute('aria-label', text('ui.xhs.reward.open'));
    actions.appendChild(button);
    block.appendChild(actions);

    block.appendChild(createElement('small', 'ui-setting-hint', 'ui.xhs.reward.hint'));
    var status = createElement('small', 'ui-setting-hint', null);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    block.appendChild(status);
    popover.appendChild(block);

    button.addEventListener('click', async function () {
      if (button.disabled) return;
      status.hidden = true;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        await miniTool.rewardAuthor();
        /* The API does not report whether or how much the user paid. */
      } catch (error) {
        status.textContent = text('ui.xhs.reward.failed');
        status.hidden = false;
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });

    clientVersion().then(function (version) {
      if (version >= MINIMUM_CLIENT_VERSION) block.hidden = false;
    });
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})(window);
