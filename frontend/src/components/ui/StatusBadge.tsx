export default function StatusBadge({
  label,
  colorCls,
}: {
  label: string;
  colorCls: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorCls}`}>
      {label}
    </span>
  );
}
