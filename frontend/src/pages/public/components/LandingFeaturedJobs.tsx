import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import type { TargetAndTransition } from "motion/react";
import Button from "@/components/ui/Button";
import type { JobPublicRead } from "@/types/api";
import { formatSalary } from "@/utils/salary";
import {
  staggerContainer,
  fadeRise,
  VIEWPORT_ONCE,
  EASE_OUT,
} from "./landingMotionUtils";

const MAX_CARDS = 5;
const MAX_VISIBLE_DEPTH = 3;
const AUTO_ADVANCE_MS = 5000;
const DRAG_THRESHOLD_PX = 60;
const PEEL_X_PX = -260;
const SHUFFLE_S = 0.7;

/** Resting transform for a card sitting `depth` cards behind the front. */
function stackPose(depth: number, hidden: boolean) {
  return {
    x: depth * -14,
    y: depth * -18,
    scale: 1 - depth * 0.05,
    opacity: hidden ? 0 : 1 - depth * 0.28,
  };
}

/* Single job card: location eyebrow, index numeral, title, description,
   and a footer rule with the salary in gold. */
function JobCard({ job, order }: { job: JobPublicRead; order: number }) {
  const { t } = useTranslation(['landing', 'common']);
  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <Link
      to={`/jobs/${job.id}`}
      draggable={false}
      className="group relative flex h-full flex-col border border-white/10 bg-card p-7 shadow-2xl transition-colors duration-300 hover:border-copper/40 sm:p-9"
    >
      <div className="brass-hairline absolute inset-x-0 top-0 h-px opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-medium tracking-widest text-copper">
          {job.location}
          {job.tags.length > 0 && ` · ${job.tags[0]}`}
        </p>
        <span className="font-display text-sm font-bold tabular-nums text-white/20">
          {String(order + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="font-display mt-5 line-clamp-2 text-2xl font-black leading-tight text-white/95 sm:text-3xl">
        {job.title}
      </h3>
      <p className="mt-4 line-clamp-3 text-sm font-light leading-relaxed text-white/50 sm:text-base">
        {job.short_description}
      </p>

      <div className="mt-auto pt-8">
        <div className="mb-5 h-px bg-white/8" />
        <div className="flex items-end justify-between gap-4">
          {salary ? (
            <div>
              <p className="text-[10px] font-medium tracking-widest text-white/30">
                {t("common:salary")}
              </p>
              <p className="font-display mt-1 text-lg font-bold tabular-nums text-gold">
                {salary}
              </p>
            </div>
          ) : (
            <span />
          )}
          <span className="text-sm font-medium text-copper transition-colors duration-300 group-hover:text-gold">
            {t("landing:featuredJobs.view")} ←
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Featured jobs: a text column beside a card deck. The deck auto-advances
   every few seconds; the front card can be dragged away or stepped with
   the arrows, peeling off and tucking under the stack. */
export default function LandingFeaturedJobs({
  jobs,
  loading,
}: {
  jobs: JobPublicRead[];
  loading: boolean;
}) {
  const { t } = useTranslation(['landing']);
  const reduceMotion = useReducedMotion();

  const featuredJobs = useMemo(
    () => jobs.filter((j) => j.is_featured).slice(0, MAX_CARDS),
    [jobs],
  );
  const count = featuredJobs.length;

  const [index, setIndex] = useState(0);
  // 1 = forward (peel left), -1 = backward (swing in from the right).
  const [direction, setDirection] = useState(1);
  const [hovering, setHovering] = useState(false);
  // Swallows the click that follows a drag so the card doesn't navigate.
  const draggedRef = useRef(false);

  const next = () => {
    setDirection(1);
    setIndex((i) => (i + 1) % count);
  };
  const prev = () => {
    setDirection(-1);
    setIndex((i) => (i - 1 + count) % count);
  };

  useEffect(() => {
    if (reduceMotion || hovering || count < 2) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
    // `index` restarts the timer after manual navigation.
  }, [reduceMotion, hovering, count, index]);

  if (loading || count === 0) return null;

  return (
    <section className="border-y border-white/6 bg-section py-24 sm:py-32">
      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="mx-auto grid max-w-7xl items-center gap-16 px-6 sm:px-12 lg:grid-cols-2 lg:gap-20"
      >
        {/* Text column */}
        <div>
          <motion.p
            variants={fadeRise}
            className="text-xs font-medium tracking-widest text-copper"
          >
            {t("landing:featuredJobs.eyebrow")}
          </motion.p>
          <motion.h2
            variants={fadeRise}
            className="font-display mt-4 text-3xl font-black leading-tight text-white/95 sm:text-5xl"
          >
            {t("landing:featuredJobs.title")}
          </motion.h2>
          <motion.p
            variants={fadeRise}
            className="mt-5 max-w-md text-base font-light leading-relaxed text-white/50 sm:text-lg"
          >
            {t("landing:featuredJobs.subtitle")}
          </motion.p>
          <motion.div variants={fadeRise}>
            <Link
              to="/jobs"
              className="mt-8 inline-block text-sm font-medium text-copper transition-colors hover:text-gold"
            >
              {t("landing:featuredJobs.viewAll")} ←
            </Link>
          </motion.div>

          {count > 1 && (
            <motion.div variants={fadeRise} className="mt-12 flex items-center gap-5">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t("landing:featuredJobs.prev")}
                  onClick={prev}
                >
                  →
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t("landing:featuredJobs.next")}
                  onClick={next}
                >
                  ←
                </Button>
              </div>
              <span dir="ltr" className="font-display text-sm tabular-nums text-white/40">
                {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </span>
              <div className="h-px flex-1 bg-white/10">
                <motion.div
                  className="brass-hairline h-full origin-right"
                  animate={{ scaleX: (index + 1) / count }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* The deck */}
        <motion.div
          variants={fadeRise}
          className="relative h-[26rem] sm:h-[27rem]"
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
        >
          {featuredJobs.map((job, i) => {
            const depth = (i - index + count) % count;
            const isFront = depth === 0;
            const hidden = depth >= MAX_VISIBLE_DEPTH;
            const pose = stackPose(depth, hidden);

            let animateTo: TargetAndTransition = pose;
            if (!reduceMotion && count > 1) {
              if (direction === 1 && (index - 1 + count) % count === i) {
                // Forward: the card that just left the front peels off
                // to the left and tucks under the stack.
                animateTo = {
                  x: [0, PEEL_X_PX, pose.x],
                  y: [0, 24, pose.y],
                  scale: [1, 0.96, pose.scale],
                  opacity: [1, 0.7, pose.opacity],
                };
              } else if (direction === -1 && isFront) {
                // Backward: the returning card swings out from the back of
                // the stack, over the right edge, and lands on the front.
                const backPose = stackPose(
                  count - 1,
                  count - 1 >= MAX_VISIBLE_DEPTH,
                );
                animateTo = {
                  x: [backPose.x, -PEEL_X_PX, 0],
                  y: [backPose.y, 24, 0],
                  scale: [backPose.scale, 0.96, 1],
                  opacity: [backPose.opacity, 0.7, 1],
                };
              }
            }

            return (
              <motion.div
                key={job.id}
                className="absolute inset-0"
                style={{
                  zIndex: count - depth,
                  pointerEvents: isFront ? "auto" : "none",
                }}
                animate={animateTo}
                transition={{ duration: reduceMotion ? 0 : SHUFFLE_S, ease: EASE_OUT }}
                drag={isFront && count > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                dragMomentum={false}
                onDragStart={() => {
                  draggedRef.current = true;
                }}
                onDragEnd={(_, info) => {
                  setTimeout(() => {
                    draggedRef.current = false;
                  }, 0);
                  if (info.offset.x < -DRAG_THRESHOLD_PX) next();
                  else if (info.offset.x > DRAG_THRESHOLD_PX) prev();
                }}
                onClickCapture={(e) => {
                  if (draggedRef.current) e.preventDefault();
                }}
              >
                <JobCard job={job} order={i} />
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
