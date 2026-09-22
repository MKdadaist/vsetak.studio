// Экраны листалки кейса: каждый экран собран по одной из схем из case-layouts.json.
// Данные экранов пишет локальная админка (/admin) в case-screens.json.
import layoutsFile from "./case-layouts.json";
import savedScreens from "./case-screens.json";

export type SlotRatio = [number, number];

export type ScreenLayout = {
  id: string;
  title: string;
  columns: string;
  rows: string;
  areas: string[];
  slots: { area: string; ratio: SlotRatio }[];
};

export type Slot = {
  // cover — абстрактная обложка-заглушка, src хранит её вариант.
  kind: "image" | "video" | "embed" | "cover";
  src: string;
  // Исходник, из которого нарезан src: по нему админка режет заново при смене схемы или кадра.
  original?: string;
  // Центр кадра в процентах от исходника.
  focus?: [number, number];
  alt?: string;
  title?: string;
};

export type Screen = {
  layout: string;
  slots: (Slot | null)[];
  // Для схемы free — собственное отношение сторон единственного слота.
  ratio?: SlotRatio;
};

export const layouts = layoutsFile.layouts as unknown as ScreenLayout[];

const byId = new Map(layouts.map((l) => [l.id, l]));

function frSum(template: string) {
  return template
    .split(/\s+/)
    .reduce((sum, part) => sum + parseFloat(part), 0);
}

// Схема free — один слот с собственными пропорциями (картинки без кадрирования).
export function screenLayout(screen: Screen): ScreenLayout {
  const known = byId.get(screen.layout);
  if (known) return known;
  const [w, h] = screen.ratio ?? [16, 8];
  return {
    id: "free",
    title: "Как есть",
    columns: `${w / h}fr`,
    rows: "1fr",
    areas: ["a"],
    slots: [{ area: "a", ratio: [w, h] }],
  };
}

export function layoutRatio(layout: ScreenLayout) {
  return frSum(layout.columns) / frSum(layout.rows);
}

export function parseRatio(ratio?: string): SlotRatio | undefined {
  if (!ratio) return undefined;
  const [w, h] = ratio.split("/").map((n) => parseFloat(n));
  return w && h ? [w, h] : undefined;
}

const store = savedScreens as unknown as Record<string, Screen[]>;

export function savedScreensFor(slug: string): Screen[] | undefined {
  const screens = store[slug];
  return screens?.length ? screens : undefined;
}
