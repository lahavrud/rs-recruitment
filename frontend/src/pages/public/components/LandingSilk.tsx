import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { createSilkRenderer, readSilkPalette } from "./landingSilkUtils";

/* Silk backdrop for the hero's start-side void: a WebGL canvas of molten
   silk bands (plum → wine → copper → gold) flowing from under the navbar
   down to the client-logo ribbon, which cuts it. Decorative only — hidden
   from AT, no pointer targets. Desktop gets the full pour beside the copy;
   below lg it stays as a subtle ambient wash behind it.

   Degradation ladder: animated WebGL → static frame (reduced motion) →
   CSS gradient wash (no WebGL2). */

/** Tailwind `lg` (64rem) — full intensity above, ambient wash below. */
const DESKTOP_QUERY = "(min-width: 64rem)";
/** Fragment work scales with dpr²; 2 is indistinguishable from native 3. */
const DESKTOP_DPR_CAP = 2;
const MOBILE_DPR_CAP = 1.5;
/** Mobile sits directly behind the copy, so it only whispers —
    any brighter and the headline loses contrast. */
const MOBILE_GAIN = 0.16;
/** Per-frame pointer easing — heavy, liquid lag behind the cursor. */
const POINTER_EASE = 0.045;
/** Entrance fade, paced with the hero copy reveal. */
const FADE_DURATION_S = 1.6;
/** Frozen timestamp for the reduced-motion still — a flattering pose. */
const STATIC_TIME_S = 23;

export default function LandingSilk() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const renderer = createSilkRenderer(canvas, readSilkPalette());
    if (!renderer) {
      // No WebGL2 — leave the CSS gradient wash underneath visible.
      canvas.style.display = "none";
      return;
    }

    const gain = isDesktop ? 1 : MOBILE_GAIN;

    let raf = 0;
    let running = false;
    let started: number | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    // Last drawn frame, so a resize can repaint synchronously (see fit()).
    let lastTime = reduceMotion ? STATIC_TIME_S : 0;
    let lastFade = reduceMotion ? 1 : 0;

    const drawFrame = () => {
      renderer.draw(lastTime, pointerX, pointerY, lastFade * gain);
    };

    const frame = (now: DOMHighResTimeStamp) => {
      raf = requestAnimationFrame(frame);
      if (started === null) started = now;
      const t = (now - started) / 1000;
      const linear = Math.min(1, t / FADE_DURATION_S);
      lastTime = t;
      lastFade = 1 - (1 - linear) ** 3;
      pointerX += (targetX - pointerX) * POINTER_EASE;
      pointerY += (targetY - pointerY) * POINTER_EASE;
      drawFrame();
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const fit = () => {
      const cap = isDesktop ? DESKTOP_DPR_CAP : MOBILE_DPR_CAP;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      renderer.resize(host.clientWidth, host.clientHeight, dpr);
      // Resizing clears the buffer to black; repaint now rather than letting
      // a black box show until the next rAF tick (visible when maximizing).
      drawFrame();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    if (reduceMotion) {
      return () => {
        ro.disconnect();
        renderer.dispose();
      };
    }

    // Parallax follows the cursor anywhere on the page — the silk is an
    // ambient layer, not a hover target.
    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Only burn GPU while the hero is actually on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    });
    io.observe(host);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      stop();
      canvas.style.display = "none";
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      renderer.dispose();
    };
  }, [isDesktop, reduceMotion]);

  return (
    /* Stage rides the content column (same pattern as the page's guide
       hairlines), inset 1px so the guides stay visible as cutting edges.
       The negative bottom extends through the hero's reserved spacer —
       keep it in sync with the spacer in LandingHero — so the canvas's
       bottom edge lands exactly on the client ribbon, which cuts the silk. */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-px top-0 -bottom-[clamp(1rem,4dvh,2.75rem)] mx-auto max-w-7xl"
    >
      {/* end-0 = the visual left in RTL: the void beside the hero copy. */}
      <div
        ref={hostRef}
        className={`absolute inset-y-0 end-0 ${isDesktop ? "w-[min(58%,46rem)]" : "w-full"}`}
      >
        {/* Static wash, visible only when WebGL2 is unavailable. */}
        <div className="absolute inset-0 [background:radial-gradient(110%_70%_at_30%_60%,color-mix(in_srgb,var(--color-wine)_16%,transparent),transparent_70%),radial-gradient(70%_55%_at_42%_24%,color-mix(in_srgb,var(--color-copper)_12%,transparent),transparent_72%)]" />
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      </div>
    </div>
  );
}
