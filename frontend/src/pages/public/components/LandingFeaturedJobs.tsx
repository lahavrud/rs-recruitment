import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

function calcProgress(el: HTMLDivElement): number {
  // Map the full teleportation cycle [start, end] → [0%, 100%].
  // start = post-teleport landing (oneSet - clientWidth/2)
  // end   = right-teleport trigger (2*oneSet - clientWidth/2)
  // distance between them = oneSet (one full content set)
  const oneSet = el.scrollWidth / 3;
  const start  = oneSet - el.clientWidth / 2;
  if (oneSet <= 0) return 0;
  return Math.min(100, Math.max(0, (el.scrollLeft - start) / oneSet * 100));
}
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJobs } from "@/services/jobs";
import type { JobPublicRead } from "@/types/api";
import FeaturedRibbon from "@/components/ui/FeaturedRibbon";
import { formatDate } from "@/utils/formatDate";

const LONG_PRESS_MS = 140;
const AUTO_SCROLL_PX = 0.5;

function useReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

function cardRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `card-reveal 0.75s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { opacity: 0, transform: "translateY(36px)" };
}

function clipRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `text-clip-rise 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { transform: "translateY(105%)" };
}

export default function LandingFeaturedJobs() {
  const { t } = useTranslation(['common', 'landing', 'publicJobs']);
  const [jobsRef, jobsVisible] = useReveal(0.15);
  const [jobs, setJobs] = useState<JobPublicRead[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);
  const hasDragged  = useRef(false);
  const velocityRef = useRef(0);
  const longTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafId       = useRef(0);
  const isHovered   = useRef(false);
  const autoRafId   = useRef(0);

  // Only featured jobs appear in the landing "משרות נבחרות" carousel.
  const featuredJobs = useMemo(() => jobs.filter((j) => j.is_featured), [jobs]);

  // Generate enough copies so scrollWidth > 3×container-width, which is
  // required for the teleportation thresholds to stay non-overlapping.
  // 3 copies suffice for 3+ jobs; fewer jobs need more copies.
  const loopedJobs = useMemo(() => {
    if (featuredJobs.length === 0) return [];
    const copies = Math.max(3, Math.ceil(9 / featuredJobs.length));
    return Array.from({ length: copies }, () => featuredJobs).flat();
  }, [featuredJobs]);

  useEffect(() => {
    let cancelled = false;
    getPublicJobs()
      .then((page) => { if (!cancelled) setJobs(page.items.slice(0, 10)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Initial scroll: park at the START of the middle set ──────────────
  useEffect(() => {
    if (loading || !featuredJobs.length) return;
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth / 3;
    });
    return () => cancelAnimationFrame(id);
  }, [loading, featuredJobs.length]);

  // ── Infinite-loop carousel: drag + momentum + long-press ─────────────
  useEffect(() => {
    if (loading || !featuredJobs.length) return;
    const el = scrollRef.current;
    if (!el) return;

    let isMouseDown = false;
    let startX      = 0;
    let startScroll = 0;
    let lastX       = 0;
    let lastT       = 0;
    let teleporting = false;

    // Arrow expressions (not function declarations) so the `el` non-null
    // narrowing from the guard above propagates into these closures under
    // tsc -b strict mode.
    const enterDrag = (clientX: number) => {
      isDragging.current = true;
      hasDragged.current = true;
      startX      = clientX;
      startScroll = el.scrollLeft;
      lastX       = clientX;
      lastT       = performance.now();
      velocityRef.current = 0;
      cancelAnimationFrame(rafId.current);
      el.style.cursor     = "grabbing";
      el.style.userSelect = "none";
    };

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      hasDragged.current = false;
      startX      = e.clientX;
      startScroll = el.scrollLeft;

      longTimer.current = setTimeout(() => enterDrag(e.clientX), LONG_PRESS_MS);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) {
        if (isMouseDown && Math.abs(e.clientX - startX) > 5) {
          clearTimeout(longTimer.current);
          enterDrag(e.clientX);
        }
        return;
      }
      e.preventDefault();

      const now = performance.now();
      const dt  = now - lastT;
      if (dt > 0) velocityRef.current = (lastX - e.clientX) / dt;
      lastX = e.clientX;
      lastT = now;

      el.scrollLeft = startScroll + (startX - e.clientX);
    };

    const onMouseUp = () => {
      isMouseDown = false;
      clearTimeout(longTimer.current);
      if (!isDragging.current) return;

      isDragging.current  = false;
      el.style.cursor     = "grab";
      el.style.userSelect = "";

      let v = velocityRef.current * 16;
      const step = () => {
        if (Math.abs(v) < 0.5) {
          hasDragged.current = false;
          return;
        }
        el.scrollLeft += v;
        v *= 0.90;
        rafId.current = requestAnimationFrame(step);
      };
      rafId.current = requestAnimationFrame(step);
    };

    const onScroll = () => {
      if (teleporting) return;
      const total  = el.scrollWidth;
      const oneSet = total / 3;

      if (el.scrollLeft < oneSet * 0.5) {
        teleporting = true;
        el.scrollLeft += oneSet;
        teleporting = false;
      } else if (el.scrollLeft > oneSet * 2 - el.clientWidth * 0.5) {
        teleporting = true;
        el.scrollLeft -= oneSet;
        teleporting = false;
      }
    };

    el.style.cursor = "grab";
    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(longTimer.current);
      cancelAnimationFrame(rafId.current);
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("scroll", onScroll);
    };
  }, [loading, featuredJobs.length]);

  // ── Auto-scroll: pauses while hovered or user is dragging/coasting ───
  useEffect(() => {
    if (loading || !featuredJobs.length) return;
    const el = scrollRef.current;
    if (!el) return;

    const tick = () => {
      if (!isHovered.current && !hasDragged.current) {
        el.scrollLeft += AUTO_SCROLL_PX;
      }
      if (progressRef.current) {
        progressRef.current.style.width = `${calcProgress(el)}%`;
      }
      autoRafId.current = requestAnimationFrame(tick);
    };
    autoRafId.current = requestAnimationFrame(tick);

    const onEnter     = () => { isHovered.current = true; };
    const onLeave     = () => { isHovered.current = false; };
    const onTouchStart = () => { isHovered.current = true; };
    const onTouchEnd   = () => { isHovered.current = false; };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(autoRafId.current);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [loading, featuredJobs.length]);

  if (loading || featuredJobs.length === 0) return null;

  return (
    <section className="bg-void py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <div ref={jobsRef}>
          {/* Heading — clip-rise; link card-rises alongside */}
          <div className="flex items-end justify-between">
            <div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-copper/70" style={clipRise(jobsVisible, "0s")}>
                  RS Recruiting
                </p>
              </div>
              <div className="mt-2 overflow-hidden">
                <h2 className="text-2xl font-semibold text-white/92 sm:text-3xl" style={clipRise(jobsVisible, "0.1s")}>
                  {t("landing:featuredJobs.title")}
                </h2>
              </div>
            </div>
            <Link
              to="/jobs"
              className="mb-1 shrink-0 text-sm text-copper/70 transition hover:text-copper"
              style={cardRise(jobsVisible, "0.15s")}
            >
              {t("landing:featuredJobs.viewAll")} ←
            </Link>
          </div>

          {/*
            dir="ltr" forces a predictable scrollLeft (0 = left edge, positive = scrolled right).
            Each card gets dir="rtl" so Hebrew text renders correctly.
            onClickCapture prevents Link navigation when the user was dragging.
          */}
          <div className="relative mt-8" style={cardRise(jobsVisible, "0.22s")}>
            <div
              ref={scrollRef}
              dir="ltr"
              className="scrollbar-none flex gap-4 overflow-x-scroll pb-2"
              style={{
                WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
              }}
              onClickCapture={(e) => {
                if (hasDragged.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
            {loopedJobs.map((job, i) => (
              <Link
                key={`${job.id}-${i}`}
                to={`/jobs/${job.id}`}
                dir="rtl"
                draggable={false}
                className="group relative flex min-h-[210px] w-[65vw] shrink-0 flex-col rounded-xl border border-gold/40 bg-card p-5 transition-colors hover:border-gold/60 sm:w-72"
              >
                <FeaturedRibbon label={t("publicJobs:board.featured")} />
                <h3 className="font-medium text-white/90">{job.title}</h3>
                <p className="mt-1 text-sm text-white/40">{job.location}</p>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/60">
                  {job.short_description}
                </p>
                {job.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-copper/25 bg-copper/10 px-2 py-0.5 text-[11px] font-medium text-copper/90"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-auto pt-4 text-xs text-white/30">
                  {t("common:posted")} {formatDate(job.created_at)}
                </p>
              </Link>
            ))}
            </div>
            {/* trailing-edge fade — suggests more cards exist beyond the right edge */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-void to-transparent" />
          </div>

          {/* Progress bar — dir="ltr" so fill grows left-to-right regardless of page RTL */}
          <div dir="ltr" className="mt-5 h-0.5 overflow-hidden rounded-full bg-white/12">
            <div
              ref={progressRef}
              className="h-full rounded-full bg-copper/70"
              style={{ width: 0 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
