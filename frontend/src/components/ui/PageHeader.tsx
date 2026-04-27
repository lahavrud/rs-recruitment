import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({ eyebrow, subtitle, action, className = "" }: PageHeaderProps) {
  return (
    <div className={`mb-6 flex items-start justify-between gap-4 ${className}`}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {eyebrow}
        </p>
        <div className="mt-3 h-px w-8 bg-copper/40" />
        {subtitle && (
          <p className="mt-4 text-sm text-white/40">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
