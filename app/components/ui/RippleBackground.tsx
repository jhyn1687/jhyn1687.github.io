import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ";

const FONT_SIZE = 13;
const LINE_HEIGHT = 20;
const FONT = `${FONT_SIZE}px "Chivo Mono", monospace`;

// Wave simulation constants
const DAMPENING = 0.95; // 1 = no decay, lower = faster decay
const AMPLITUDE = 4; // max character displacement in px
const DISTURBANCE_SCALE = 0.4; // mouse speed → disturbance magnitude
const DISTURBANCE_MAX = 15;

// Passive droplets
const DROPLET_INTERVAL_MS = 500; // ms between droplets
const DROPLET_INTERVAL_VARIANCE = 50; // random offset in ms
const DROPLET_STRENGTH = 5;
const DROPLET_RADIUS_PX = 25; // visual radius of the initial ring

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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.font = FONT;
      charWidth = ctx.measureText("m").width;
      cols = Math.floor(canvas.width / charWidth) + 1;
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
      const filler = LOREM.repeat(Math.ceil(needed / LOREM.length));
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = FONT;
      ctx.fillStyle = "rgba(255,255,255,0.15)";

      const visibleRows = Math.min(rows, lineTexts.length);
      for (let r = 0; r < visibleRows; r++) {
        const line = lineTexts[r];
        const baseY = r * LINE_HEIGHT + FONT_SIZE;

        for (let c = 0; c < line.length && c < cols; c++) {
          const height = curr[(r + 1) * cols + c]; // +1: row 0 is top buffer
          ctx.fillText(line[c], c * charWidth, baseY + height * AMPLITUDE);
        }
      }

      animId = requestAnimationFrame(render);
    }

    function disturb(x: number, y: number, dx: number, dy: number) {
      const speed = Math.sqrt(dx * dx + dy * dy);
      if (!(speed >= 1)) return; // also catches NaN
      const c = Math.round(x / charWidth);
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
      disturb(e.clientX, e.clientY, dx, dy);
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
            touch.clientX,
            touch.clientY,
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
      const cx = Math.floor(Math.random() * cols);
      const cy = Math.floor(Math.random() * (rows - 2)) + 1; // +1: row 0 is top buffer
      const colRadius = DROPLET_RADIUS_PX / charWidth;
      const rowRadius = DROPLET_RADIUS_PX / LINE_HEIGHT;
      const steps = Math.ceil(2 * Math.PI * Math.max(colRadius, rowRadius));
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const c = Math.round(cx + Math.cos(angle) * colRadius);
        const r = Math.round(cy + Math.sin(angle) * rowRadius);
        if (r >= 1 && r < rows - 1 && c >= 1 && c < cols - 1) {
          const i = r * cols + c;
          curr[i] += DROPLET_STRENGTH;
        }
      }
    }

    buildLayout();
    const dropletTimer = setInterval(
      dropRandomly,
      DROPLET_INTERVAL_MS + (Math.random() - 0.5) * DROPLET_INTERVAL_VARIANCE,
    );
    window.addEventListener("resize", buildLayout);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(dropletTimer);
      window.removeEventListener("resize", buildLayout);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
