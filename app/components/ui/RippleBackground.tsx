import { flavors } from "@catppuccin/palette";
import { loremIpsum } from "lorem-ipsum";
import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

const { colors: mocha } = flavors.mocha;

const FONT_SIZE = 13;
const LINE_HEIGHT = 20;
const FONT = `${FONT_SIZE}px "Chivo Mono", monospace`;

// Wave simulation constants
const DAMPENING = 0.98;
const AMPLITUDE = 2; // subtle Y displacement; color carries the main effect
const DISTURBANCE_SCALE = 0.5;
const DISTURBANCE_MAX = 15;

// Bioluminescence rendering
// Wave amplitude above which the glow is at full brightness
const WAVE_MAX = 8;
// Catppuccin Mocha: crust as background, teal as peak glow
const BG_COLOR = mocha.crust.hex;
const { r: tr, g: tg, b: tb } = mocha.teal.rgb;
const { r: cr, g: cg, b: cb } = mocha.crust.rgb;
// Precomputed color table: index 0 = undisturbed (crust, near-invisible), 255 = peak glow (teal)
const COLOR_TABLE = Array.from({ length: 256 }, (_, i) => {
  const t = i / 255;
  const t2 = t * t; // quadratic curve for dramatic dark→glow transition
  const r = Math.round(cr + t2 * (tr - cr));
  const g = Math.round(cg + t2 * (tg - cg));
  const b = Math.round(cb + t2 * (tb - cb));
  const a = (0.04 + t * 0.96).toFixed(3);
  return `rgba(${r},${g},${b},${a})`;
});

// Extra canvas padding beyond the viewport on each side so Safari's
// rubber-band overscroll never reveals an empty background
const OVERSCROLL_PAD = 100;

// Passive droplets
const DROPLET_INTERVAL_MS = 1000;
const DROPLET_INTERVAL_VARIANCE = 100;
const DROPLET_STRENGTH = 5;
const DROPLET_RADIUS_PX = 25;

export function RippleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const mouse = { x: NaN, y: NaN };
    let animId: number;
    let charWidth = 0;
    let cols = 0;
    let rows = 0;
    let curr: Float32Array;
    let prev: Float32Array;
    let next: Float32Array;
    let lineTexts: string[] = [];
    // Aspect-corrected wave coefficients (recomputed in buildLayout)
    // Goal: equal wave speed in pixel space horizontally and vertically
    // cH/cV = (LINE_HEIGHT/charWidth)², constraint cH+cV ≤ 0.5
    let cH = 0.225;
    let cV = 0.225;

    function buildLayout() {
      canvas.width = window.innerWidth + OVERSCROLL_PAD * 2;
      canvas.height = window.innerHeight + OVERSCROLL_PAD * 2;
      ctx.font = FONT;
      charWidth = ctx.measureText("m").width;
      // +2: one ghost column on each side (col 0 and cols-1 are boundaries)
      cols = Math.floor(canvas.width / charWidth) + 2;
      rows = Math.floor(canvas.height / LINE_HEIGHT) + 2;

      curr = new Float32Array(cols * rows);
      prev = new Float32Array(cols * rows);
      next = new Float32Array(cols * rows);

      // Aspect-corrected wave coefficients so ripples are circular in pixel space.
      // Wave speed in pixels/step: proportional to sqrt(c) * cellSize.
      // Equal speed requires cH/cV = (LINE_HEIGHT/charWidth)².
      // Stability constraint: cH + cV ≤ 0.5.
      const aspectSq = (LINE_HEIGHT / charWidth) ** 2;
      const cTotal = 0.48;
      cV = cTotal / (1 + aspectSq);
      cH = (cTotal * aspectSq) / (1 + aspectSq);

      const needed = cols * rows * 2;
      const filler = loremIpsum({ count: needed, units: "words" });
      const prepared = prepareWithSegments(filler, FONT);
      const result = layoutWithLines(prepared, canvas.width, LINE_HEIGHT);
      lineTexts = result.lines.map((l) => l.text);
    }

    function stepWater() {
      // Aspect-corrected 2D wave equation.
      // cH (horizontal) and cV (vertical) are scaled so wave speed is equal in pixel space.
      const cCenter = 2 - 2 * cH - 2 * cV;
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          const i = r * cols + c;
          next[i] =
            (cH * (curr[i - 1] + curr[i + 1]) +
              cV * (curr[i - cols] + curr[i + cols]) +
              cCenter * curr[i] -
              prev[i]) *
            DAMPENING;
        }
      }
      const tmp = prev;
      prev = curr;
      curr = next;
      next = tmp;
    }

    function render() {
      stepWater();

      // Dark ocean background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = FONT;

      // rows-2: skip top and bottom boundary rows (stepWater never updates them)
      const visibleRows = Math.min(rows - 2, lineTexts.length);
      let lastColor = "";

      for (let r = 0; r < visibleRows; r++) {
        const line = lineTexts[r];
        const baseY = r * LINE_HEIGHT + FONT_SIZE;

        for (let c = 0; c < line.length && c < cols - 2; c++) {
          // c+1: skip left boundary col 0; grid col maps 1:1 to visual col
          const wave = curr[(r + 1) * cols + (c + 1)];

          // Bioluminescent color from wave amplitude
          const t = Math.min(Math.abs(wave) / WAVE_MAX, 1);
          const color = COLOR_TABLE[Math.floor(t * 255)];
          if (color !== lastColor) {
            ctx.fillStyle = color;
            lastColor = color;
          }

          ctx.fillText(line[c], c * charWidth, baseY + wave * AMPLITUDE);
        }
      }

      animId = requestAnimationFrame(render);
    }

    function disturb(x: number, y: number, dx: number, dy: number) {
      const speed = Math.sqrt(dx * dx + dy * dy);
      if (!(speed >= 1)) return; // also catches NaN
      const c = Math.round(x / charWidth) + 1; // +1: col 0 is left boundary
      const r = Math.round(y / LINE_HEIGHT) + 1; // +1: row 0 is top buffer
      if (r >= 1 && r < rows - 1 && c >= 1 && c < cols - 1) {
        const i = r * cols + c;
        curr[i] += Math.min(speed * DISTURBANCE_SCALE, DISTURBANCE_MAX);
      }
    }

    function onMouseMove(e: MouseEvent) {
      const dx = e.clientX - mouse.x;
      const dy = e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      disturb(e.clientX + OVERSCROLL_PAD, e.clientY + OVERSCROLL_PAD, dx, dy);
    }

    // Track previous positions per touch identifier
    const touchPrev = new Map<number, { x: number; y: number }>();

    function onTouchStart(e: TouchEvent) {
      for (const touch of e.changedTouches) {
        touchPrev.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
    }

    function onTouchMove(e: TouchEvent) {
      for (const touch of e.changedTouches) {
        const prev = touchPrev.get(touch.identifier);
        if (prev) {
          disturb(
            touch.clientX + OVERSCROLL_PAD,
            touch.clientY + OVERSCROLL_PAD,
            touch.clientX - prev.x,
            touch.clientY - prev.y,
          );
        }
        touchPrev.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
    }

    function onTouchEnd(e: TouchEvent) {
      for (const touch of e.changedTouches) {
        touchPrev.delete(touch.identifier);
      }
    }

    function dropRandomly() {
      // Random position in active grid interior (skip boundary rows/cols)
      const cx = Math.floor(Math.random() * (cols - 2)) + 1;
      const cy = Math.floor(Math.random() * (rows - 2)) + 1;
      const colRadius = DROPLET_RADIUS_PX / charWidth;
      const rowRadius = DROPLET_RADIUS_PX / LINE_HEIGHT;
      const steps = Math.ceil(2 * Math.PI * Math.max(colRadius, rowRadius));
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const c = Math.round(cx + Math.cos(angle) * colRadius);
        const r = Math.round(cy + Math.sin(angle) * rowRadius);
        if (r >= 1 && r < rows - 1 && c >= 1 && c < cols - 1) {
          const idx = r * cols + c;
          curr[idx] += DROPLET_STRENGTH;
        }
      }
    }

    let dropletTimer: ReturnType<typeof setInterval> | null = null;
    function startDroplets() {
      dropletTimer = setInterval(
        dropRandomly,
        DROPLET_INTERVAL_MS + (Math.random() - 0.5) * DROPLET_INTERVAL_VARIANCE,
      );
    }
    function stopDroplets() {
      if (dropletTimer !== null) {
        clearInterval(dropletTimer);
        dropletTimer = null;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopDroplets();
      } else {
        // Clear accumulated disturbances from when the tab was hidden
        curr.fill(0);
        prev.fill(0);
        next.fill(0);
        startDroplets();
      }
    }

    buildLayout();
    startDroplets();
    window.addEventListener("resize", buildLayout);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      stopDroplets();
      window.removeEventListener("resize", buildLayout);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed -z-10 pointer-events-none"
      style={{ inset: `-${OVERSCROLL_PAD}px` }}
      data-darkreader-ignore
    />
  );
}
