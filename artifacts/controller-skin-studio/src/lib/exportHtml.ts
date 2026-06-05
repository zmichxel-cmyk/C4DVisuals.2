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

  const lStick = sticks[0];
  const rStick = sticks[1];
  const MAX_OP = config.buttonOpacity;
  const GLOW = config.glowEnabled;
  const GLOW_SIZE = config.glowSize;
  const INNER_FADE = config.innerFade;
  const PER_BTN_COLORS = config.usePerButtonColors;
  const DEFAULT_COLOR = config.buttonColor;
  const TRAVEL = config.stickTravel;
  const ltLabel = config.controllerType === "xbox-one" ? "LT" : "L2";
  const rtLabel = config.controllerType === "xbox-one" ? "RT" : "R2";

  const buttonStyles = buttons.map((b) => {
    const hPct = buttonHeightPct(b);
    const radius = buttonBorderRadius(b.shape);
    const color = PER_BTN_COLORS ? (baseLayout.buttonColors[b.index] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
    return `
    [data-btn="${b.index}"] {
      left: ${b.x}%; top: ${b.y}%;
      width: ${b.size}%; height: ${hPct}%;
      border-radius: ${radius};
      transform: translate(-50%,-50%);
      --c: ${color};
    }`;
  }).join("");

  const controllerBg = config.controllerSkin
    ? `url("${config.controllerSkin}") center/contain no-repeat`
    : "none";

  const leftImg = config.leftStickSkin
    ? `<img src="${config.leftStickSkin}" class="stick-img" id="lstick-img" />`
    : `<div class="stick-fallback" id="lstick-img"></div>`;

  const rightImg = config.rightStickSkin
    ? `<img src="${config.rightStickSkin}" class="stick-img" id="rstick-img" />`
    : `<div class="stick-fallback" id="rstick-img"></div>`;

  const buttonsHtml = buttons.map((b) => `<div class="btn" data-btn="${b.index}"></div>`).join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${config.overlayName || "Controller Overlay"}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:transparent; overflow:hidden; width:${config.width}px; height:${config.height}px; }

  #controller { position:relative; width:100%; height:100%; background:${controllerBg}; }

  .btn {
    position:absolute; pointer-events:none;
    opacity:0;
    background:var(--c, ${DEFAULT_COLOR});
    transition: opacity .04s, box-shadow .04s;
  }
  ${buttonStyles}

  .stick-wrap { position:absolute; transform:translate(-50%,-50%); aspect-ratio:1/1; }
  #lstick-wrap { left:${lStick.x}%; top:${lStick.y}%; width:${lStick.size}%; }
  #rstick-wrap { left:${rStick.x}%; top:${rStick.y}%; width:${rStick.size}%; }
  .stick-img,.stick-fallback { width:100%; height:100%; object-fit:contain; }
  .stick-fallback { border-radius:50%; background:rgba(255,255,255,.12); border:2px solid rgba(255,255,255,.25); }

  /* Trigger bars */
  .tbar { position:absolute; bottom:6px; display:flex; align-items:center; gap:4px;
          font:9px monospace; color:rgba(255,255,255,.4); }
  #lt-bar { left:6px; } #rt-bar { right:6px; }
  .tbar-bg { width:40px; height:5px; background:rgba(255,255,255,.08); border-radius:3px; overflow:hidden; }
  .tbar-fill { height:100%; background:#fb923c; border-radius:3px; width:0%; transition:width .06s; }

  /* Connect status */
  #status {
    position:absolute; top:6px; right:6px;
    font:9px monospace; padding:2px 8px; border-radius:9999px;
    background:rgba(0,0,0,.5); color:rgba(255,255,255,.3);
    border:1px solid rgba(255,255,255,.12);
    transition:all .3s;
  }
  #status.connected { background:rgba(16,185,129,.15); color:#6ee7b7; border-color:rgba(16,185,129,.35); }
</style>
</head>
<body>
<div id="controller">
  ${buttonsHtml}
  <div class="stick-wrap" id="lstick-wrap">${leftImg}</div>
  <div class="stick-wrap" id="rstick-wrap">${rightImg}</div>
</div>
<div class="tbar" id="lt-bar"><span>${ltLabel}</span><div class="tbar-bg"><div class="tbar-fill" id="lt-fill"></div></div></div>
<div class="tbar" id="rt-bar"><div class="tbar-bg"><div class="tbar-fill" id="rt-fill"></div></div><span>${rtLabel}</span></div>
<div id="status">○ ${baseLayout.connectMessage}</div>

<script>
(function(){
  var DEAD = 0.06, TRAVEL = ${TRAVEL}, MAX_OP = ${MAX_OP};
  var GLOW = ${GLOW}, GLOW_SIZE = ${GLOW_SIZE}, INNER_FADE = ${INNER_FADE};
  var DEF_COLOR = "${DEFAULT_COLOR}";

  var lstick = document.getElementById('lstick-img');
  var rstick = document.getElementById('rstick-img');
  var ltFill = document.getElementById('lt-fill');
  var rtFill = document.getElementById('rt-fill');
  var statusEl = document.getElementById('status');
  var btns = document.querySelectorAll('.btn');

  function dead(v){ return Math.abs(v)<DEAD ? 0 : v; }

  function hexToRgba(hex, a){
    var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  function innerFadeBg(c){
    return 'radial-gradient(circle at center,'+c+' 0%,'+hexToRgba(c,.55)+' 45%,transparent 100%)';
  }

  function applyBtn(el, pressed, val){
    var c = el.style.getPropertyValue('--c') || DEF_COLOR;
    var op = pressed ? (val > 0 ? val * MAX_OP : MAX_OP) : 0;
    el.style.opacity = op;
    if(INNER_FADE) el.style.background = op > 0 ? innerFadeBg(c) : c;
    el.style.boxShadow = (GLOW && op > 0.01)
      ? '0 0 '+GLOW_SIZE+'px '+hexToRgba(c,.9)+', 0 0 '+(GLOW_SIZE*2)+'px '+hexToRgba(c,.4)
      : 'none';
  }

  function poll(){
    var gps = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = null;
    for(var i=0;i<gps.length;i++){ if(gps[i]){ gp=gps[i]; break; } }

    if(!gp){ requestAnimationFrame(poll); return; }

    statusEl.textContent = '● Connected';
    statusEl.className = 'connected';

    // Triggers (analog)
    var ltVal = gp.buttons[6] ? gp.buttons[6].value : 0;
    var rtVal = gp.buttons[7] ? gp.buttons[7].value : 0;
    if(gp.axes.length>2 && gp.axes[2]!==undefined) ltVal = Math.max(ltVal,(gp.axes[2]+1)/2);
    if(gp.axes.length>5 && gp.axes[5]!==undefined) rtVal = Math.max(rtVal,(gp.axes[5]+1)/2);

    // Apply all buttons
    for(var b=0;b<btns.length;b++){
      var idx = parseInt(btns[b].getAttribute('data-btn'));
      if(idx===6){ applyBtn(btns[b], ltVal>0.02, ltVal); continue; }
      if(idx===7){ applyBtn(btns[b], rtVal>0.02, rtVal); continue; }
      var pressed = gp.buttons[idx] ? (gp.buttons[idx].pressed || gp.buttons[idx].value>0.1) : false;
      applyBtn(btns[b], pressed, 1);
    }

    // Trigger bars
    if(ltFill) ltFill.style.width = (ltVal*100)+'%';
    if(rtFill) rtFill.style.width = (rtVal*100)+'%';

    // Stick animation
    var lx=dead(gp.axes[0]||0), ly=dead(gp.axes[1]||0);
    var rx=dead(gp.axes[2]||0), ry=dead(gp.axes[3]||0);
    lstick.style.transform = 'translate('+(lx*TRAVEL)+'px,'+(ly*TRAVEL)+'px)';
    rstick.style.transform = 'translate('+(rx*TRAVEL)+'px,'+(ry*TRAVEL)+'px)';

    requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', function(){ requestAnimationFrame(poll); });
  requestAnimationFrame(poll);
})();
</script>
</body>
</html>`;
}
