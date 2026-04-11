(function () {
  'use strict';

  var BASE_URL = 'https://www.travelzada.com';

  // Support both <script data-agent="ravindra"> and <travelzada-planner agent="ravindra">
  function getConfig(el) {
    return {
      agent: el.getAttribute('data-agent') || el.getAttribute('agent') || '',
      height: el.getAttribute('data-height') || el.getAttribute('height') || '720px',
      width: el.getAttribute('data-width') || el.getAttribute('width') || '100%',
      theme: el.getAttribute('data-theme') || el.getAttribute('theme') || 'light',
      rounded: el.getAttribute('data-rounded') || el.getAttribute('rounded') || '16',
    };
  }

  function buildIframe(config) {
    var url = BASE_URL + '/tailored-travel/' + config.agent + '?embed=1&theme=' + config.theme;
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'yes');
    iframe.setAttribute('allow', 'geolocation');
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.cssText = [
      'width:' + config.width,
      'height:' + config.height,
      'border:none',
      'border-radius:' + config.rounded + 'px',
      'display:block',
      'background:#f9fafb',
    ].join(';');
    return iframe;
  }

  // ── Script tag mode ──────────────────────────────────────────────────────
  // Usage: <script src=".../widget.js" data-agent="ravindra" data-height="700px"></script>
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (currentScript && currentScript.getAttribute('data-agent')) {
    var config = getConfig(currentScript);
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;max-width:100%;overflow:hidden;';
    wrapper.appendChild(buildIframe(config));
    currentScript.parentNode.insertBefore(wrapper, currentScript);
  }

  // ── Web Component mode ───────────────────────────────────────────────────
  // Usage: <travelzada-planner agent="ravindra" height="700px"></travelzada-planner>
  if (typeof window.customElements !== 'undefined') {
    var TravelzadaPlanner = function () {
      return Reflect.construct(HTMLElement, [], TravelzadaPlanner);
    };
    TravelzadaPlanner.prototype = Object.create(HTMLElement.prototype);
    TravelzadaPlanner.prototype.constructor = TravelzadaPlanner;

    TravelzadaPlanner.prototype.connectedCallback = function () {
      var config = getConfig(this);
      if (!config.agent) return;
      this.style.cssText = 'display:block;width:' + config.width;
      this.appendChild(buildIframe(config));
    };

    try {
      window.customElements.define('travelzada-planner', TravelzadaPlanner);
    } catch (e) { /* already registered */ }
  }
})();
