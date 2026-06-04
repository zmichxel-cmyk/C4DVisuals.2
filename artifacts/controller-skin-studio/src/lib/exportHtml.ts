import { ControllerConfig } from "../types/config";
import { XBOX_LAYOUT } from "./controllerLayout";

export function generateExportHtml(config: ControllerConfig): string {
  const layout = XBOX_LAYOUT;

  const btnColor = config.buttonColor;
  const btnOpacity = config.buttonOpacity;
  const stickTravel = config.stickTravel;

  // Build button style definitions
  const buttonStyles = layout.buttons
    .map((b) => {
      const w = b.size;
      const h = b.shape === "pill-h" ? b.size * 0.45 : b.shape === "pill-v" ? b.size * 0.45 : b.size;
      const borderRadius =
        b.shape === "circle" || b.shape.startsWith("cross")
          ? "50%"
          : "9999px";
      return `
      [data-btn="${b.index}"] {
        left: ${b.x}%;
        top: ${b.y}%;
        width: ${w}%;
        height: ${b.shape === "pill-h" ? w * 0.45 : w}%;
        border-radius: ${borderRadius};
        transform: translate(-50%, -50%);
        background: ${btnColor};
        opacity: 0;
        transition: opacity 0.04s;
      }
      [data-btn="${b.index}"].pressed { opacity: ${btnOpacity}; }`;
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

  const lStick = layout.sticks[0];
  const rStick = layout.sticks[1];

  const buttonsHtml = layout.buttons
    .map((b) => `<div class="btn-overlay" data-btn="${b.index}"></div>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Controller Overlay</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: transparent;
    overflow: hidden;
    width: ${config.width}px;
    height: ${config.height}px;
  }

  #controller {
    position: relative;
    width: 100%;
    height: 100%;
    background: ${controllerBg};
  }

  .btn-overlay {
    position: absolute;
    pointer-events: none;
  }

  ${buttonStyles}

  .stick-wrap {
    position: absolute;
    transform: translate(-50%, -50%);
  }

  #lstick-wrap {
    left: ${lStick.x}%;
    top: ${lStick.y}%;
    width: ${lStick.size}%;
    height: ${lStick.size}%;
  }

  #rstick-wrap {
    left: ${rStick.x}%;
    top: ${rStick.y}%;
    width: ${rStick.size}%;
    height: ${rStick.size}%;
  }

  .stick-img, .stick-fallback {
    width: 100%;
    height: 100%;
    object-fit: contain;
    position: relative;
  }

  .stick-fallback {
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 2px solid rgba(255,255,255,0.3);
  }

  #connected-badge {
    position: fixed;
    bottom: 8px;
    right: 8px;
    font-family: sans-serif;
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    display: none;
  }
</style>
</head>
<body>
<div id="controller">
  ${buttonsHtml}

  <div class="stick-wrap" id="lstick-wrap">
    ${leftStickImg}
  </div>
  <div class="stick-wrap" id="rstick-wrap">
    ${rightStickImg}
  </div>
</div>
<div id="connected-badge">Controller connected</div>

<script>
(function() {
  var DEAD_ZONE = 0.08;
  var STICK_TRAVEL = ${stickTravel};
  var lStickEl = document.getElementById('lstick-img');
  var rStickEl = document.getElementById('rstick-img');
  var badge = document.getElementById('connected-badge');

  function dead(v) { return Math.abs(v) < DEAD_ZONE ? 0 : v; }

  function poll() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = null;
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { gp = gamepads[i]; break; }
    }

    if (!gp) {
      requestAnimationFrame(poll);
      return;
    }

    badge.style.display = 'block';

    // Buttons
    var btns = document.querySelectorAll('.btn-overlay');
    for (var b = 0; b < btns.length; b++) {
      var idx = parseInt(btns[b].getAttribute('data-btn'));
      var pressed = gp.buttons[idx] ? (gp.buttons[idx].pressed || gp.buttons[idx].value > 0.1) : false;
      btns[b].classList.toggle('pressed', pressed);
    }

    // Sticks
    var lx = dead(gp.axes[0] || 0);
    var ly = dead(gp.axes[1] || 0);
    var rx = dead(gp.axes[2] || 0);
    var ry = dead(gp.axes[3] || 0);

    lStickEl.style.transform = 'translate(' + (lx * STICK_TRAVEL) + 'px, ' + (ly * STICK_TRAVEL) + 'px)';
    rStickEl.style.transform = 'translate(' + (rx * STICK_TRAVEL) + 'px, ' + (ry * STICK_TRAVEL) + 'px)';

    requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', function() {
    requestAnimationFrame(poll);
  });

  requestAnimationFrame(poll);
})();
</script>
</body>
</html>`;
}
