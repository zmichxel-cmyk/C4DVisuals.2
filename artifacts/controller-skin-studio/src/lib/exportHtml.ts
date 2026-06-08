import { ControllerConfig, LayoutOverrides } from "../types/config";
import { LAYOUTS } from "./layouts";
import { hexToRgba } from "./controllerLayout";

async function toDataUrl(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export async function generateExportHtml(config: ControllerConfig, overrides: LayoutOverrides): Promise<string> {
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

  const ltLabel = config.controllerType === "xbox-one" ? "LT" : "L2";
  const rtLabel = config.controllerType === "xbox-one" ? "RT" : "R2";

  // ── Embed all mask images as base64 data URIs (self-contained file) ──────
  const maskDataUrls: Record<number, string> = {};
  await Promise.all(
    buttons.map(async (btn) => {
      const maskDef = baseLayout.buttonMasks[btn.index];
      if (maskDef) {
        maskDataUrls[btn.index] = await toDataUrl(maskDef.url);
      }
    })
  );

  // ── Embed skin images too ────────────────────────────────────────────────
  const [skinDataUrl, leftStickDataUrl, rightStickDataUrl] = await Promise.all([
    config.controllerSkin ? toDataUrl(config.controllerSkin) : Promise.resolve(""),
    config.leftStickSkin  ? toDataUrl(config.leftStickSkin)  : Promise.resolve(""),
    config.rightStickSkin ? toDataUrl(config.rightStickSkin) : Promise.resolve(""),
  ]);

  const MAX_OP = config.buttonOpacity;
  const GLOW = config.glowEnabled;
  const GLOW_SIZE = config.glowSize;
  const INNER_FADE = config.innerFade;
  const PER_BTN = config.usePerButtonColors;
  const DEF_COLOR = config.buttonColor;
  const TRAVEL = config.stickTravel;

  // Per-button CSS: mask-image + center coords + color variable
  const btnCss = buttons.map((btn) => {
    const maskDef = baseLayout.buttonMasks[btn.index];
    const color = PER_BTN ? (baseLayout.buttonColors[btn.index] ?? DEF_COLOR) : DEF_COLOR;
    const cx = maskDef?.cx ?? 50;
    const cy = maskDef?.cy ?? 50;
    const maskUrl = maskDataUrls[btn.index];

    // For mask buttons, position at mask center (cx,cy) for perfect alignment
    const posX = maskDef ? cx : btn.x;
    const posY = maskDef ? cy : btn.y;

    if (maskUrl) {
      const hPct = btn.shape === "pill-h" || btn.shape === "rect" ? btn.size * 0.45 : btn.size;
      return `
  [data-btn="${btn.index}"] {
    --c: ${color};
    --cx: ${cx}%;
    --cy: ${cy}%;
    left: ${posX}%; top: ${posY}%;
    width: ${btn.size}%; height: ${hPct}%;
    transform: translate(-50%,-50%);
    position: absolute;
    -webkit-mask-image: url("${maskUrl}");
    mask-image: url("${maskUrl}");
    -webkit-mask-size: ${baseLayout.skinWidth}px ${baseLayout.skinHeight}px;
    mask-size: ${baseLayout.skinWidth}px ${baseLayout.skinHeight}px;
    -webkit-mask-position: ${posX}% ${posY}%;
    mask-position: ${posX}% ${posY}%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }`;
    }

    // Geometric fallback
    const hPct = btn.shape === "pill-h" || btn.shape === "rect" ? btn.size * 0.45 : btn.size;
    const radius = btn.shape === "circle" || btn.shape.startsWith("cross")
      ? "50%" : btn.shape === "rect" ? "8px" : "9999px";
    return `
  [data-btn="${btn.index}"] {
    --c: ${color};
    --cx: ${cx}%;
    --cy: ${cy}%;
    left: ${posX}%; top: ${posY}%;
    width: ${btn.size}%; height: ${hPct}%;
    border-radius: ${radius};
    transform: translate(-50%,-50%);
    position: absolute;
  }`;
  }).join("");

  const isMasked = (idx: number) => !!maskDataUrls[idx];
  const btnHtml = buttons.map((btn) =>
    isMasked(btn.index)
      ? `<div class="btn btn-masked" data-btn="${btn.index}"></div>`
      : `<div class="btn btn-geo"    data-btn="${btn.index}"></div>`
  ).join("\n    ");

  const controllerBg = skinDataUrl ? `url("${skinDataUrl}") center/contain no-repeat` : "none";
  const leftStickImg = leftStickDataUrl
    ? `<img src="${leftStickDataUrl}" class="stick-img" id="lstick-img" />`
    : `<div class="stick-fallback" id="lstick-img"></div>`;
  const rightStickImg = rightStickDataUrl
    ? `<img src="${rightStickDataUrl}" class="stick-img" id="rstick-img" />`
    : `<div class="stick-fallback" id="rstick-img"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${config.overlayName || "Controller Overlay"}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:transparent; overflow:hidden; width:${config.width}px; height:${config.height}px; }

  #controller { position:relative; width:100%; height:100%; background:${controllerBg}; }

  /* Masked buttons: positioned at mask center, clipped to exact button shape */
  .btn-masked {
    position:absolute;
    pointer-events:none;
    opacity:0;
    background:var(--c, ${DEF_COLOR});
    filter:none;
    transition: opacity .04s, filter .04s;
  }

  /* Geometric fallback buttons */
  .btn-geo {
    pointer-events:none;
    opacity:0;
    background:var(--c, ${DEF_COLOR});
    filter:none;
    transition: opacity .04s, filter .04s;
  }

  ${btnCss}

  .stick-wrap { position:absolute; transform:translate(-50%,-50%); aspect-ratio:1/1; }
  #lstick-wrap { left:${lStick.x}%; top:${lStick.y}%; width:${lStick.size}%; }
  #rstick-wrap { left:${rStick.x}%; top:${rStick.y}%; width:${rStick.size}%; }
  .stick-img,.stick-fallback { width:100%; height:100%; object-fit:contain; }
  .stick-fallback { border-radius:50%; background:rgba(255,255,255,.12); border:2px solid rgba(255,255,255,.25); }

  .tbar { position:absolute; bottom:6px; display:flex; align-items:center; gap:4px;
          font:9px monospace; color:rgba(255,255,255,.4); }
  #lt-bar { left:6px; } #rt-bar { right:6px; }
  .tbar-bg { width:40px; height:5px; background:rgba(255,255,255,.08); border-radius:3px; overflow:hidden; }
  .tbar-fill { height:100%; background:#fb923c; border-radius:3px; width:0%; transition:width .06s; }

  #status {
    position:absolute; top:6px; right:6px;
    font:9px monospace; padding:2px 8px; border-radius:9999px;
    background:rgba(0,0,0,.5); color:rgba(255,255,255,.3);
    border:1px solid rgba(255,255,255,.12); transition:all .3s;
  }
  #status.connected { background:rgba(16,185,129,.15); color:#6ee7b7; border-color:rgba(16,185,129,.35); }
</style>
</head>
<body>
<div id="controller">
  ${btnHtml}
  <div class="stick-wrap" id="lstick-wrap">${leftStickImg}</div>
  <div class="stick-wrap" id="rstick-wrap">${rightStickImg}</div>
</div>
<div class="tbar" id="lt-bar"><span>${ltLabel}</span><div class="tbar-bg"><div class="tbar-fill" id="lt-fill"></div></div></div>
<div class="tbar" id="rt-bar"><div class="tbar-bg"><div class="tbar-fill" id="rt-fill"></div></div><span>${rtLabel}</span></div>
<div id="status">○ ${baseLayout.connectMessage}</div>

<script>
(function(){
  var DEAD=${DEAD_ZONE}, TRAVEL=${TRAVEL}, MAX_OP=${MAX_OP};
  var GLOW=${GLOW}, GLOW_SIZE=${GLOW_SIZE}, INNER_FADE=${INNER_FADE};
  var DEF_COLOR="${DEF_COLOR}";

  function hexToRgba(hex, a){
    var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }
  function innerFadeBg(c, cx, cy){
    return 'radial-gradient(circle at '+cx+' '+cy+', '+c+' 0%, '+hexToRgba(c,.5)+' 45%, transparent 100%)';
  }
  function dead(v){ return Math.abs(v)<DEAD ? 0 : v; }

  var lstick = document.getElementById('lstick-img');
  var rstick = document.getElementById('rstick-img');
  var ltFill = document.getElementById('lt-fill');
  var rtFill = document.getElementById('rt-fill');
  var statusEl = document.getElementById('status');
  var btns = document.querySelectorAll('.btn');

  function applyBtn(el, op){
    var c = getComputedStyle(el).getPropertyValue('--c').trim() || DEF_COLOR;
    var cx = getComputedStyle(el).getPropertyValue('--cx').trim() || '50%';
    var cy = getComputedStyle(el).getPropertyValue('--cy').trim() || '50%';
    el.style.opacity = op;
    el.style.background = (INNER_FADE && op > 0) ? innerFadeBg(c, cx, cy) : c;
    el.style.filter = (GLOW && op > 0.01)
      ? 'drop-shadow(0 0 '+GLOW_SIZE+'px '+hexToRgba(c,.9)+') drop-shadow(0 0 '+(GLOW_SIZE*2)+'px '+hexToRgba(c,.4)+')'
      : 'none';
  }

  function poll(){
    var gps = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = null;
    for(var i=0;i<gps.length;i++){ if(gps[i]){ gp=gps[i]; break; } }
    if(!gp){ requestAnimationFrame(poll); return; }

    statusEl.textContent = '● Connected';
    statusEl.className = 'connected';

    var ltVal = gp.buttons[6] ? gp.buttons[6].value : 0;
    var rtVal = gp.buttons[7] ? gp.buttons[7].value : 0;
    if(gp.axes.length>2) ltVal = Math.max(ltVal,(gp.axes[2]+1)/2);
    if(gp.axes.length>5) rtVal = Math.max(rtVal,(gp.axes[5]+1)/2);

    for(var b=0;b<btns.length;b++){
      var idx = parseInt(btns[b].getAttribute('data-btn'));
      if(idx===6){ applyBtn(btns[b], ltVal*MAX_OP); continue; }
      if(idx===7){ applyBtn(btns[b], rtVal*MAX_OP); continue; }
      var pressed = gp.buttons[idx] ? (gp.buttons[idx].pressed || gp.buttons[idx].value>0.1) : false;
      applyBtn(btns[b], pressed ? MAX_OP : 0);
    }

    if(ltFill) ltFill.style.width=(ltVal*100)+'%';
    if(rtFill) rtFill.style.width=(rtVal*100)+'%';

    var lx=dead(gp.axes[0]||0), ly=dead(gp.axes[1]||0);
    var rx=dead(gp.axes[2]||0), ry=dead(gp.axes[3]||0);
    lstick.style.transform='translate('+(lx*TRAVEL)+'px,'+(ly*TRAVEL)+'px)';
    rstick.style.transform='translate('+(rx*TRAVEL)+'px,'+(ry*TRAVEL)+'px)';

    requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', function(){ requestAnimationFrame(poll); });
  requestAnimationFrame(poll);
})();
</script>
</body>
</html>`;
}

const DEAD_ZONE = 0.06;
