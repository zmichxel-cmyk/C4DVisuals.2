import { ControllerConfig, LayoutOverrides } from "../types/config";
import { LAYOUTS } from "./layouts";
import { buttonHeightPct, buttonBorderRadius } from "./controllerLayout";

export function generateExportHtml(config: ControllerConfig, overrides: LayoutOverrides): string {
  const baseLayout = LAYOUTS[config.controllerType];

  const buttons = baseLayout.buttons.map((b) => ({
    ...b,
    ...(overrides.buttons[b.index] ?? {}),
  }));
  const sticks = baseLayout.sticks.map((s, i) => ({
    ...s,
    ...(overrides.sticks[i] ?? {}),
  }));

  const btnColor = config.buttonColor;
  const btnOpacity = config.buttonOpacity;
  const stickTravel = config.stickTravel;
  const lStick = sticks[0];
  const rStick = sticks[1];

  // Build per-button CSS
  const buttonStyles = buttons
    .map((b) => {
      const hPct = buttonHeightPct(b);
      const radius = buttonBorderRadius(b.shape);
      const isTrigger = b.index === 6 || b.index === 7;
      return `
      [data-btn="${b.index}"] {
        left: ${b.x}%;
        top: ${b.y}%;
        width: ${b.size}%;
        height: ${hPct}%;
        border-radius: ${radius};
        transform: translate(-50%, -50%);
        background: ${btnColor};
        opacity: 0;
        ${isTrigger ? "" : `transition: opacity 0.04s;`}
      }
      ${!isTrigger ? `[data-btn="${b.index}"].pressed { opacity: ${btnOpacity}; }` : ""}`;
    })
    .join("\n");

  const controllerBg = config.controllerSkin
    ? `url("${config.controllerSkin}") center/contain no-repeat`
    : "none";

  const leftStickImg = config.leftStickSkin
    ? `<img src="${config.leftStickSkin}" class="stick-img" id="lstick-img" />`
    : `<div class="stick-fallback" id="lstick-img"></div>`;

  const rightStickImg = config.rightStickSkin
    ? `<img src="${config.rightStickSkin}" class="stick-img" id="rstick-img" />`
    : `<div class="stick-fallback" id="rstick-img"></div>`;

  const buttonsHtml = buttons
    .map((b) => `<div class="btn-overlay" data-btn="${b.index}"></div>`)
    .join("\n      ");

  const ltLabel = config.controllerType === "xbox-one" ? "LT" : "L2";
  const rtLabel = config.controllerType === "xbox-one" ? "RT" : "R2";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Controller Overlay — ${baseLayout.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; overflow: hidden; width: ${config.width}px; height: ${config.height}px; }

  #controller {
    position: relative;
    width: 100%;
    height: 100%;
    background: ${controllerBg};
  }

  .btn-overlay { position: absolute; pointer-events: none; }
  ${buttonStyles}

  .stick-wrap {
    position: absolute;
    transform: translate(-50%, -50%);
    aspect-ratio: 1/1;
  }
  #lstick-wrap { left: ${lStick.x}%; top: ${lStick.y}%; width: ${lStick.size}%; }
  #rstick-wrap { left: ${rStick.x}%; top: ${rStick.y}%; width: ${rStick.size}%; }

  .stick-img, .stick-fallback { width: 100%; height: 100%; object-fit: contain; }
  .stick-fallback {
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: 2px solid rgba(255,255,255,0.25);
  }

  /* Trigger bars */
  .trigger-bar-wrap {
    position: absolute;
    bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: monospace;
    font-size: 9px;
    color: rgba(255,255,255,0.45);
  }
  #lt-bar-wrap { left: 6px; }
  #rt-bar-wrap { right: 6px; }
  .trigger-bar-bg {
    width: 40px; height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    overflow: hidden;
  }
  .trigger-bar-fill {
    height: 100%;
    background: #fb923c;
    border-radius: 3px;
    width: 0%;
  }
</style>
</head>
<body>
<div id="controller">
  ${buttonsHtml}
  <div class="stick-wrap" id="lstick-wrap">${leftStickImg}</div>
  <div class="stick-wrap" id="rstick-wrap">${rightStickImg}</div>
</div>

<!-- Trigger bars -->
<div class="trigger-bar-wrap" id="lt-bar-wrap">
  <span>${ltLabel}</span>
  <div class="trigger-bar-bg"><div class="trigger-bar-fill" id="lt-fill"></div></div>
</div>
<div class="trigger-bar-wrap" id="rt-bar-wrap">
  <div class="trigger-bar-bg"><div class="trigger-bar-fill" id="rt-fill"></div></div>
  <span>${rtLabel}</span>
</div>

<script>
(function() {
  var DEAD = 0.06;
  var TRAVEL = ${stickTravel};
  var MAX_OP = ${btnOpacity};
  var lStick = document.getElementById('lstick-img');
  var rStick = document.getElementById('rstick-img');
  var ltFill = document.getElementById('lt-fill');
  var rtFill = document.getElementById('rt-fill');
  var btns = document.querySelectorAll('.btn-overlay');

  function dead(v) { return Math.abs(v) < DEAD ? 0 : v; }

  function poll() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = null;
    for (var i = 0; i < gamepads.length; i++) { if (gamepads[i]) { gp = gamepads[i]; break; } }
    if (!gp) { requestAnimationFrame(poll); return; }

    // Triggers (analog)
    var ltVal = gp.buttons[6] ? gp.buttons[6].value : 0;
    var rtVal = gp.buttons[7] ? gp.buttons[7].value : 0;
    // Some controllers send triggers via axes
    if (gp.axes.length > 2 && gp.axes[2] !== undefined) ltVal = Math.max(ltVal, (gp.axes[2] + 1) / 2);
    if (gp.axes.length > 5 && gp.axes[5] !== undefined) rtVal = Math.max(rtVal, (gp.axes[5] + 1) / 2);

    // Update trigger overlays (analog opacity)
    var ltEl = document.querySelector('[data-btn="6"]');
    var rtEl = document.querySelector('[data-btn="7"]');
    if (ltEl) ltEl.style.opacity = ltVal * MAX_OP;
    if (rtEl) rtEl.style.opacity = rtVal * MAX_OP;
    if (ltFill) ltFill.style.width = (ltVal * 100) + '%';
    if (rtFill) rtFill.style.width = (rtVal * 100) + '%';

    // Regular buttons
    for (var b = 0; b < btns.length; b++) {
      var idx = parseInt(btns[b].getAttribute('data-btn'));
      if (idx === 6 || idx === 7) continue;
      var pressed = gp.buttons[idx] ? (gp.buttons[idx].pressed || gp.buttons[idx].value > 0.1) : false;
      btns[b].style.opacity = pressed ? MAX_OP : 0;
    }

    // Sticks
    var lx = dead(gp.axes[0] || 0), ly = dead(gp.axes[1] || 0);
    var rx = dead(gp.axes[2] || 0), ry = dead(gp.axes[3] || 0);
    lStick.style.transform = 'translate(' + (lx * TRAVEL) + 'px,' + (ly * TRAVEL) + 'px)';
    rStick.style.transform = 'translate(' + (rx * TRAVEL) + 'px,' + (ry * TRAVEL) + 'px)';

    requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', function() { requestAnimationFrame(poll); });
  requestAnimationFrame(poll);
})();
</script>
</body>
</html>`;
}
