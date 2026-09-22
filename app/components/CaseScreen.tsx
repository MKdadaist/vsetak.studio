"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  layoutRatio,
  screenLayout,
  type Screen,
  type Slot,
} from "../screens";
import type { CoverVariant } from "../cases";
import { CaseCover } from "./CaseCover";

export function SlotMedia({ slot }: { slot: Slot }) {
  const position = slot.focus
    ? `${slot.focus[0]}% ${slot.focus[1]}%`
    : undefined;

  if (slot.kind === "cover") {
    return (
      <CaseCover variant={slot.src as CoverVariant} className="case-media" />
    );
  }
  if (slot.kind === "video") {
    return (
      <video
        className="case-media"
        src={slot.src}
        style={{ objectPosition: position }}
        controls
        muted
        loop
        playsInline
      />
    );
  }
  if (slot.kind === "embed") {
    return (
      <iframe
        className="case-media"
        src={slot.src}
        title={slot.title ?? "Встроенная страница"}
        loading="lazy"
        allowFullScreen
      />
    );
  }
  return (
    <img
      className="case-media"
      src={slot.src}
      alt={slot.alt ?? ""}
      style={{ objectPosition: position }}
    />
  );
}

// Экран по схеме: сетка слотов с фиксированным отношением сторон,
// которое на сайте ещё и ограничено высотой окна (см. .case-screen).
export function CaseScreen({
  screen,
  className = "case-screen",
  renderSlot,
}: {
  screen: Screen;
  className?: string;
  renderSlot?: (slot: Slot | null, index: number) => ReactNode;
}) {
  const layout = screenLayout(screen);
  const style = {
    "--screen-ratio": layoutRatio(layout),
    gridTemplateColumns: layout.columns,
    gridTemplateRows: layout.rows,
    gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(" "),
  } as CSSProperties;

  // На телефоне экран с главной широкой ячейкой (16:9 и шире) раскладывается
  // в столбик, остальные (пары, триптихи) остаются рядом.
  const [w, h] = layout.slots[0].ratio;
  const stack = layout.slots.length > 1 && w / h >= 1.7;

  return (
    <div className={className} style={style} data-stack={stack || undefined}>
      {layout.slots.map((def, i) => {
        const slot = screen.slots[i] ?? null;
        return (
          <div
            className={`case-slot${slot ? "" : " is-empty"}`}
            key={`${def.area}-${i}`}
            style={
              {
                gridArea: def.area,
                "--slot-ratio": `${def.ratio[0]} / ${def.ratio[1]}`,
              } as CSSProperties
            }
          >
            {renderSlot
              ? renderSlot(slot, i)
              : slot && <SlotMedia slot={slot} />}
          </div>
        );
      })}
    </div>
  );
}
