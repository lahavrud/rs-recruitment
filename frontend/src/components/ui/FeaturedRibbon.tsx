/**
 * Hanging ribbon pinned to the top-left of a card.
 *
 * Vertical hanging tag with a clip-path V-notch tail, copper→gold gradient
 * body, diagonal sheen overlay, and a drop-shadow filter on the wrapper so
 * the shadow follows the notched silhouette. The text stays horizontal — no
 * rotation, no SVG path quirks.
 *
 * Animates on parent `group` hover: padding-top grows so the text and
 * V-notch fall together (ribbon "drops"); tail length stays constant.
 *
 * Requires the parent card to be `position: relative` and to carry `group`
 * for the hover animation to trigger.
 */
/** Minimal white flame — paired with the "hot job" label. */
function FlameIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-2.5 shrink-0 text-white"
      aria-hidden="true"
    >
      <path d="M12 2c.7 2.5 2.5 3.5 2.5 6a2.5 2.5 0 0 1-5 0c0-1 .4-1.7 1-2.3C9 7 9 5 12 2zm0 8c3.5 0 6 2.8 6 6.3a6 6 0 1 1-12 0c0-2 1-3.5 2.4-4.5-.1 1.6.7 2.7 1.9 3.3-.7-2.2.7-3.5 1.7-5.1z" />
    </svg>
  );
}

export default function FeaturedRibbon({ label }: { label: string }) {
  return (
    <div
      className="pointer-events-none absolute -top-1 left-5 z-10 sm:left-6"
      style={{ filter: "drop-shadow(2px 3px 4px rgba(0,0,0,0.55))" }}
      aria-hidden="true"
    >
      <div
        className="flex items-center justify-center gap-1 px-2.5 pt-2 pb-4 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white transition-[padding-top] duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:pt-9"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 55%), linear-gradient(180deg, var(--color-gold-light) 0%, var(--color-gold) 35%, var(--color-copper) 75%, var(--color-copper-dark) 100%)",
          clipPath:
            "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 8px), 0 100%)",
        }}
      >
        <FlameIcon />
        <span>{label}</span>
      </div>
    </div>
  );
}
