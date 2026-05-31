import type { ReactNode } from "react";

/**
 * Smaller, account-controls card — visually demoted from the profile
 * cards above. Icon-led title in a single row so the header takes less
 * vertical space, lighter border + subtler background, ghost-buttoned
 * actions to keep the surface from competing with the main profile
 * group for attention.
 */
export default function SettingsCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-white/6 bg-card-raised/40 p-5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/55">
          {icon}
        </span>
        <h3 className="text-sm font-medium text-white/80">{title}</h3>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}
