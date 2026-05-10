interface Props {
  name: string;
  className?: string;
}

export default function CompanyName({ name, className }: Props) {
  return (
    <span className={`font-medium text-copper ${className ?? ""}`.trim()}>
      {name}
    </span>
  );
}
