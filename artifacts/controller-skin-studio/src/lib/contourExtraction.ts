// Extracts an ordered contour (list of points, normalized 0-1) from the alpha
// channel of an image — used by edge-tracing body effects (lightning, data trace).

export interface ContourPoint {
  x: number; // 0-1, relative to image width
  y: number; // 0-1, relative to image height
  // Approximate outward normal direction at this point (radians), useful for
  // offsetting traces or spawning sparks perpendicular to the edge.
  nx: number;
  ny: number;
}

const SAMPLE_SIZE = 220; // downscale resolution for edge detection

/**
 * Loads an image (data URL or path) and extracts boundary points where opaque
 * pixels meet transparent ones. Returns points roughly ordered along the
 * silhouette via greedy nearest-neighbor chaining, with approximate normals.
 */
export async function extractContour(imageUrl: string): Promise<ContourPoint[]> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  const scale = Math.min(SAMPLE_SIZE / img.naturalWidth, SAMPLE_SIZE / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const alphaAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return data[(y * w + x) * 4 + 3];
  };

  const THRESHOLD = 30;
  const boundary: { x: number; y: number; nx: number; ny: number }[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) <= THRESHOLD) continue;
      // Check 4-neighbors for transparency — mark as boundary if any neighbor is transparent
      const left = alphaAt(x - 1, y), right = alphaAt(x + 1, y);
      const up = alphaAt(x, y - 1), down = alphaAt(x, y + 1);
      if (left <= THRESHOLD || right <= THRESHOLD || up <= THRESHOLD || down <= THRESHOLD) {
        // Outward normal points toward the transparent side(s)
        let nx = (left <= THRESHOLD ? -1 : 0) + (right <= THRESHOLD ? 1 : 0);
        let ny = (up <= THRESHOLD ? -1 : 0) + (down <= THRESHOLD ? 1 : 0);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        boundary.push({ x, y, nx, ny });
      }
    }
  }

  if (boundary.length === 0) return [];

  // Greedy nearest-neighbor ordering to produce a traversable path.
  // For large boundary sets this is O(n^2); SAMPLE_SIZE keeps n manageable (~hundreds-low thousands).
  const ordered: { x: number; y: number; nx: number; ny: number }[] = [];
  const used = new Array(boundary.length).fill(false);
  let current = 0;
  used[0] = true;
  ordered.push(boundary[0]);

  // Cap iterations for safety on large boundary sets
  const MAX_POINTS = 2000;
  for (let i = 1; i < boundary.length && ordered.length < MAX_POINTS; i++) {
    const cur = boundary[current];
    let bestIdx = -1;
    let bestDist = Infinity;
    // Limit search window for performance — search nearby unused points first via simple scan
    for (let j = 0; j < boundary.length; j++) {
      if (used[j]) continue;
      const dx = boundary[j].x - cur.x, dy = boundary[j].y - cur.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; bestIdx = j; }
    }
    if (bestIdx === -1) break;
    // If the nearest point is very far (separate disconnected region), still include it —
    // multiple contours (e.g. left/right grips) are fine for our purposes.
    used[bestIdx] = true;
    ordered.push(boundary[bestIdx]);
    current = bestIdx;
  }

  return ordered.map(p => ({
    x: p.x / w,
    y: p.y / h,
    nx: p.nx,
    ny: p.ny,
  }));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
