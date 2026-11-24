'use strict';

(function (root) {
  var LOCALE_KEY = 'shellbreak.locale';
  var platform = root.shellbreakPlatform;
  var isElectron = !!(platform && platform.runtime === 'electron');
  function dicts() { return root.ShellbreakLocales || Object.create(null); }
  function localeUrls() { return root.ShellbreakLocaleUrls || null; }
  var canLocalize = !!(
    platform
      ? (isElectron ? platform.localizationEnabled === true : platform.localizationEnabled !== false)
      : !!(localeUrls() || dicts()['en-US'] || dicts()['zh-TW'])
  );
  var SUPPORTED_PREFERENCES = isElectron ? ['steam', 'zh-CN', 'en-US', 'zh-TW'] : ['zh-CN', 'en-US', 'zh-TW'];
  var preference = 'zh-CN';
  var locale = 'zh-CN';
  var pendingLoads = Object.create(null);
  var loadSeq = 0;

  function steamLanguage() {
    if (!canLocalize || !isElectron) return '';
    try {
      return new URL(root.location.href).searchParams.get('steamLanguage') || '';
    } catch (e) {
      return '';
    }
  }

  function isLocaleComplete(code) {
    var dictionary = dicts()[code];
    var coverage = root.ShellbreakLocaleCoverage && root.ShellbreakLocaleCoverage[code];
    return !!(
      dictionary &&
      coverage &&
      coverage.complete === true &&
      Number(coverage.activeKeys) > 0 &&
      Object.keys(dictionary).length >= Number(coverage.activeKeys)
    );
  }

  function hasLocaleSource(code) {
    if (code === 'zh-CN') return true;
    var urls = localeUrls();
    if (code === 'zh-TW') return isLocaleComplete('zh-TW') || !!(urls && urls['zh-TW']);
    return !!(dicts()[code] || (urls && urls[code]));
  }

  function localeForSteamLanguage(language) {
    var code = String(language || '').trim().toLowerCase().replace(/_/g, '-');
    if (code === 'tchinese' || code === 'zh-tw' || code === 'zh-hant' || code.indexOf('zh-tw-') === 0) {
      return isLocaleComplete('zh-TW') ? 'zh-TW' : 'zh-CN';
    }
    return code === 'english' || code === 'en' || code.indexOf('en-') === 0
      ? 'en-US'
      : 'zh-CN';
  }

  function resolveLocale(value) {
    if (!canLocalize) return 'zh-CN';
    if (value === 'en-US') return dicts()['en-US'] ? 'en-US' : 'zh-CN';
    if (value === 'zh-CN') return 'zh-CN';
    if (value === 'zh-TW') return isLocaleComplete('zh-TW') ? 'zh-TW' : 'zh-CN';
    return isElectron ? localeForSteamLanguage(steamLanguage()) : 'zh-CN';
  }

  if (canLocalize) {
    var defaultPreference = isElectron ? 'steam' : 'zh-CN';
    try {
      var saved = root.localStorage.getItem(LOCALE_KEY);
      preference = SUPPORTED_PREFERENCES.indexOf(saved) >= 0 ? saved : defaultPreference;
      if ((preference === 'en-US' || preference === 'zh-TW') && !hasLocaleSource(preference)) {
        preference = defaultPreference;
      }
    } catch (e) {
      preference = defaultPreference;
    }
  }
  locale = resolveLocale(preference);

  function valueFor(key) {
    if (typeof key !== 'string' || !key) return undefined;
    var all = dicts();
    var active = all[locale];
    var baseline = all['zh-CN'];
    if (active && Object.prototype.hasOwnProperty.call(active, key)) return active[key];
    if (baseline && Object.prototype.hasOwnProperty.call(baseline, key)) return baseline[key];
    return undefined;
  }

  function translate(key, params) {
    var template = valueFor(key);
    if (typeof template !== 'string') return '';
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, function (placeholder, name) {
      return params && Object.prototype.hasOwnProperty.call(params, name)
        ? String(params[name])
        : placeholder;
    });
  }

  var RESOURCE_NAME_KEYS = {
    kelp: 'resource.kelp.name', coral: 'content.coral.name', stone: 'content.stone.name',
    silt: 'resource.metal.name', warmstone: 'resource.warmstone.name', iron: 'resource.iron.name',
    steel: 'content.steel.name', titanium: 'content.titanium.name', uranium: 'resource.uranium.name',
    tiplate: 'content.tiplate.name', thetaMetal: 'content.theta_metal.name',
    thinafilm: 'resource.theta_metal_adaptive_film.name',
    strongProp: 'resource.strong_propellant_rocket_engine.name',
    starExplore: 'resource.star_exploration.name', science: 'content.science.name',
    fuel: 'content.fuel.name', culture: 'resource.civic_points.name', luxury: 'content.luxury.name',
    militaryPower: 'resource.military_power.name',
    faith: 'content.faith.name', stoneBeam: 'resource.stone_beam.name',
    ironBracket: 'content.iron_bracket.name', rope: 'content.rope.name',
    hardCoral: 'resource.hardened_coral.name', hydro: 'resource.hydrothermal_energy.name',
    steelPart: 'content.steel_part.name', scaffold: 'content.scaffold.name',
    artwork: 'content.artwork.name', tidalRecord: 'content.tidal_record.name',
    resonantDrill: 'content.resonant_drill.name', sealbin: 'content.sealbin.name',
    rocketFuel: 'content.rocket_fuel.name', rocketEngine: 'content.rocket_engine.name',
    stardust: 'content.stardust.name', population: 'resource.population.name'
  };
  function mappedName(key, fallback) {
    var value = key && valueFor(key);
    return typeof value === 'string' ? translate(key) : (fallback || '');
  }
  function snakeCase(value) {
    return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  }
  function buildingName(id, fallback) {
    var name = String(id || '') === 'rheamine' ? 'rhea_mine' : snakeCase(id);
    return mappedName('building.' + name + '.name', fallback);
  }
  function zoneName(id, fallback) {
    return mappedName('building.zone.' + String(id || '') + '.name', fallback);
  }
  function contentName(id, fallback) {
    var name = snakeCase(id);
    var candidates = ['content.' + name + '.name'];
    if (name.indexOf('upg_') !== 0) candidates.unshift('content.upg_' + name + '.name');
    for (var i = 0; i < candidates.length; i++) {
      if (typeof valueFor(candidates[i]) === 'string') return translate(candidates[i]);
    }
    return fallback || '';
  }
  function resourceName(id, fallback) {
    return mappedName(RESOURCE_NAME_KEYS[id], fallback);
  }

  function apply(rootNode) {
    if (!root.document || !rootNode) return;
    var scope = rootNode;
    var selectors = [
      ['data-i18n', null],
      ['data-i18n-aria-label', 'aria-label'],
      ['data-i18n-title', 'title'],
      ['data-i18n-placeholder', 'placeholder']
    ];
    if (scope.nodeType === 1 && scope.hasAttribute('data-i18n')) {
      var rootKey = scope.getAttribute('data-i18n');
      var rootValue = valueFor(rootKey);
      if (typeof rootValue === 'string') scope.textContent = rootValue;
    }
    selectors.forEach(function (entry) {
      var attribute = entry[0];
      var targetAttribute = entry[1];
      var nodes = scope.querySelectorAll ? scope.querySelectorAll('[' + attribute + ']') : [];
      Array.prototype.forEach.call(nodes, function (node) {
        var translated = translate(node.getAttribute(attribute));
        if (!translated) return;
        if (targetAttribute) node.setAttribute(targetAttribute, translated);
        else node.textContent = translated;
      });
    });
    if (root.document.documentElement) root.document.documentElement.lang = locale;
  }

  function dispatchLocaleChanged() {
    if (!root.dispatchEvent || !root.CustomEvent) return;
    root.dispatchEvent(new root.CustomEvent('shellbreak:locale-changed', {
      detail: { locale: locale, preference: preference }
    }));
  }

  function syncSelectorValue() {
    if (!root.document || typeof root.document.querySelector !== 'function') return;
    var select = root.document.querySelector('[data-language-selector]');
    if (select && select.value !== preference) select.value = preference;
  }

  function refresh() {
    locale = resolveLocale(preference);
    apply(root.document);
    syncSelectorValue();
    dispatchLocaleChanged();
  }

  function ensureLocaleLoaded(code, done) {
    if (code === 'zh-CN' || code === 'steam') { done(true); return; }
    if (code === 'zh-TW' ? isLocaleComplete('zh-TW') : !!dicts()[code]) { done(true); return; }
    var urls = localeUrls();
    var src = urls && urls[code];
    if (!src || !root.document || !root.document.head) { done(false); return; }
    if (pendingLoads[code]) {
      pendingLoads[code].push(done);
      return;
    }
    pendingLoads[code] = [done];
    var script = root.document.createElement('script');
    script.src = src;
    script.async = true;
    function finish(ok) {
      var list = pendingLoads[code] || [];
      delete pendingLoads[code];
      for (var i = 0; i < list.length; i++) list[i](ok);
    }
    script.onload = function () {
      var ready = code === 'zh-TW' ? isLocaleComplete('zh-TW') : !!dicts()[code];
      finish(ready);
    };
    script.onerror = function () { finish(false); };
    root.document.head.appendChild(script);
  }

  function commitLocalePreference(value) {
    preference = value;
    try {
      root.localStorage.setItem(LOCALE_KEY, preference);
    } catch (e) {}
    refresh();
  }

  function setLocale(value) {
    if (!canLocalize || SUPPORTED_PREFERENCES.indexOf(value) < 0) return false;
    if ((value === 'en-US' || value === 'zh-TW') && !hasLocaleSource(value)) return false;
    var reqSeq = ++loadSeq;
    var targetCode = (value === 'en-US' || value === 'zh-TW') ? value : '';
    if (!targetCode || (targetCode === 'zh-TW' ? isLocaleComplete('zh-TW') : !!dicts()[targetCode])) {
      commitLocalePreference(value);
      return true;
    }
    ensureLocaleLoaded(targetCode, function (ok) {
      if (reqSeq !== loadSeq) return;
      if (ok) {
        commitLocalePreference(value);
      } else {
        syncSelectorValue();
      }
    });
    return true;
  }

  function mountLanguageSelector() {
    var block = root.document && root.document.getElementById('localeSettingBlock');
    if (!block) return;
    if (!canLocalize || (!hasLocaleSource('en-US') && !hasLocaleSource('zh-TW'))) {
      block.hidden = true;
      return;
    }

    var label = root.document.createElement('label');
    label.className = 'ui-setting-row ui-setting-row--select';
    var title = root.document.createElement('span');
    var titleText = root.document.createElement('b');
    titleText.setAttribute('data-i18n', 'ui.settings.language.title');
    titleText.textContent = translate('ui.settings.language.title');
    title.appendChild(titleText);

    var select = root.document.createElement('select');
    select.className = 'ui-resolution-select';
    select.setAttribute('aria-label', translate('ui.settings.language.title'));
    select.setAttribute('data-i18n-aria-label', 'ui.settings.language.title');
    select.setAttribute('data-language-selector', '');
    var options = [];
    if (isElectron) options.push(['steam', 'ui.settings.language.follow_steam']);
    options.push(['zh-CN', 'ui.settings.language.simplified_chinese']);
    if (hasLocaleSource('en-US')) options.push(['en-US', 'ui.settings.language.english']);
    if (hasLocaleSource('zh-TW')) options.push(['zh-TW', 'ui.settings.language.traditional_chinese']);
    options.forEach(function (item) {
      var option = root.document.createElement('option');
      option.value = item[0];
      option.setAttribute('data-i18n', item[1]);
      option.textContent = translate(item[1]);
      select.appendChild(option);
    });
    select.value = preference;
    select.addEventListener('change', function () { setLocale(select.value); });
    label.appendChild(title);
    label.appendChild(select);
    if (typeof block.replaceChildren === 'function') {
      block.replaceChildren(label);
    } else if (typeof block.appendChild === 'function') {
      if (typeof block.removeChild === 'function') {
        while (block.firstChild) block.removeChild(block.firstChild);
      } else {
        block.innerHTML = '';
      }
      block.appendChild(label);
    }
    block.hidden = false;
  }

  var api = {
    t: translate,
    resourceName: resourceName,
    buildingName: buildingName,
    zoneName: zoneName,
    contentName: contentName,
    apply: apply,
    setLocale: setLocale,
    getLocale: function () { return locale; },
    getPreference: function () { return canLocalize ? preference : 'zh-CN'; },
    isEnabled: function () { return canLocalize; }
  };
  root.SB = root.SB || {};
  root.SB.i18n = api;

  function boot() {
    apply(root.document);
    mountLanguageSelector();
    syncSelectorValue();
    dispatchLocaleChanged();
  }

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
