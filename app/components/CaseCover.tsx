import type { CoverVariant } from "../cases";

// Абстрактные обложки кейсов: спокойная графика в цветах сайта,
// пока у кейса нет собственного изображения.
export function CaseCover({
  variant,
  className,
}: {
  variant: CoverVariant;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      role="presentation"
    >
      <rect width="480" height="300" fill="var(--cover-bg)" />
      {variant === "rings" && (
        <g fill="none" stroke="var(--ink)" strokeWidth="1">
          {[24, 52, 80, 108, 136, 164].map((r) => (
            <circle key={r} cx="300" cy="150" r={r} />
          ))}
          <circle cx="300" cy="150" r="7" fill="var(--accent)" stroke="none" />
        </g>
      )}
      {variant === "grid" && (
        <g stroke="var(--ink)" strokeWidth="1">
          {[60, 120, 180, 240, 300, 360, 420].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" />
          ))}
          {[60, 120, 180, 240].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="480" y2={y} />
          ))}
          <rect
            x="240"
            y="120"
            width="60"
            height="60"
            fill="var(--accent)"
            stroke="none"
          />
        </g>
      )}
      {variant === "waves" && (
        <g fill="none" stroke="var(--ink)" strokeWidth="1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M -20 ${60 + i * 32} C 120 ${30 + i * 32}, 240 ${
                90 + i * 32
              }, 500 ${52 + i * 32}`}
            />
          ))}
          <path
            d="M -20 124 C 120 94, 240 154, 500 116"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        </g>
      )}
      {variant === "dots" && (
        <g fill="var(--ink)">
          {Array.from({ length: 6 }).flatMap((_, row) =>
            Array.from({ length: 10 }).map((_, col) => {
              const accent = row === 2 && col === 6;
              return (
                <circle
                  key={`${row}-${col}`}
                  cx={48 + col * 43}
                  cy={45 + row * 42}
                  r={accent ? 9 : 2.5}
                  fill={accent ? "var(--accent)" : "var(--ink)"}
                />
              );
            }),
          )}
        </g>
      )}
    </svg>
  );
}
