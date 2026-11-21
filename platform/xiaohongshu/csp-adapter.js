/* Event delegation for legacy inline handlers in the isolated XHS build. */
(function (root) {
  'use strict';

  function closestAction(node) {
    while (node && node !== document) {
      if (node.getAttribute && (node.hasAttribute('data-xhs-intro') || node.hasAttribute('data-xhs-action'))) return node;
      node = node.parentNode;
    }
    return null;
  }

  document.addEventListener('click', function (event) {
    var target = closestAction(event.target);
    if (!target) return;

    var intro = target.getAttribute('data-xhs-intro');
    if (intro) {
      event.preventDefault();
      event.stopPropagation();
      if (root.SB && root.SB.ui && root.SB.ui.openIntro) root.SB.ui.openIntro(intro);
      return;
    }

    var action = target.getAttribute('data-xhs-action');
    if (action === 'intro-backdrop') {
      if (event.target === target && root.SB && root.SB.ui && root.SB.ui.closeIntro) root.SB.ui.closeIntro();
      return;
    }
    if (action === 'intro-close') {
      event.preventDefault();
      event.stopPropagation();
      if (root.SB && root.SB.ui && root.SB.ui.closeIntro) root.SB.ui.closeIntro();
      return;
    }
    if (action === 'challenge-details') {
      if (root.SB && root.SB.game && root.SB.game.setTab) root.SB.game.setTab('challenges');
      return;
    }
    if (action === 'meta-rebirth' || action === 'meta-stardust') {
      event.preventDefault();
      if (root.SB && root.SB.ui && root.SB.ui.render && root.SB.ui.render.setMetaShopView) {
        root.SB.ui.render.setMetaShopView(action === 'meta-rebirth' ? 'rebirth' : 'stardust');
      }
      return;
    }
    if (action === 'hover-info') {
      event.preventDefault();
      event.stopPropagation();
      if (root.SB && root.SB.ui && root.SB.ui.showHoverInfo) root.SB.ui.showHoverInfo(target.getAttribute('title'));
    }
  }, true);
})(window);
