(function () {
  "use strict";

  const root = document.documentElement;
  const navigatorReference = window.navigator || navigator;
  const touchDevice =
    Number(navigatorReference?.maxTouchPoints || 0) > 0 ||
    "ontouchstart" in window;

  if (touchDevice) root.classList.add("touch-device");

  function updateViewportHeight() {
    const height = window.visualViewport?.height || window.innerHeight;
    if (height > 0) root.style.setProperty("--app-viewport-height", `${Math.round(height)}px`);
    return height;
  }

  updateViewportHeight();
  window.addEventListener("resize", updateViewportHeight, { passive: true });
  window.addEventListener("orientationchange", updateViewportHeight, { passive: true });
  window.visualViewport?.addEventListener("resize", updateViewportHeight, { passive: true });

  window.BenMobileEnvironment = {
    touchDevice,
    updateViewportHeight
  };
})();
