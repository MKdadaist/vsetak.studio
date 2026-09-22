"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
import {
  caseScreens,
  directions,
  findCase,
  firstImage,
  type CaseItem,
} from "../cases";
import { CaseScreen } from "../components/CaseScreen";
import {
  layouts,
  savedScreensFor,
  screenLayout,
  type Screen,
  type Slot,
} from "../screens";

const SLOT_MIME = "application/x-vsetak-slot";
const isDev = process.env.NODE_ENV !== "production";

type SlotRef = { screen: number; slot: number };

function initialScreens(item: CaseItem): Screen[] {
  return structuredClone(savedScreensFor(item.slug) ?? caseScreens(item));
}

function slotFromUrl(url: string): Slot {
  const kind = /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "embed";
  return { kind, src: url };
}

async function uploadFile(slug: string, file: File) {
  const params = new URLSearchParams({ slug, name: file.name });
  const res = await fetch(`/__admin/upload?${params}`, {
    method: "POST",
    body: file,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить");
  return data.original as string;
}

export function AdminEditor() {
  const [slug, setSlug] = useState(directions[0].cases[0].slug);
  const item = findCase(slug)!;
  const [screens, setScreens] = useState<Screen[]>(() => initialScreens(item));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const update = useCallback((next: (prev: Screen[]) => Screen[]) => {
    setScreens((prev) => next(structuredClone(prev)));
    setDirty(true);
    setStatus(null);
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectCase = (next: string) => {
    if (next === slug) return;
    if (dirty && !window.confirm("Есть несохранённые изменения. Перейти без сохранения?")) {
      return;
    }
    setSlug(next);
    setScreens(initialScreens(findCase(next)!));
    setDirty(false);
    setStatus(null);
  };

  const setSlot = (ref: SlotRef, slot: Slot | null) =>
    update((all) => {
      all[ref.screen].slots[ref.slot] = slot;
      return all;
    });

  const dropFiles = async (ref: SlotRef, files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) {
      setStatus("Можно перетаскивать только картинки");
      return;
    }
    const layout = screenLayout(screens[ref.screen]);
    const targets: number[] = [ref.slot];
    for (let i = 0; i < layout.slots.length && targets.length < images.length; i++) {
      if (i !== ref.slot && !screens[ref.screen].slots[i]) targets.push(i);
    }
    const extra = images.length - targets.length;
    await Promise.all(
      targets.map(async (slotIndex, n) => {
        const key = `${ref.screen}:${slotIndex}`;
        setBusy((b) => ({ ...b, [key]: true }));
        try {
          const original = await uploadFile(slug, images[n]);
          setSlot(
            { screen: ref.screen, slot: slotIndex },
            { kind: "image", src: original, original, focus: [50, 50] },
          );
        } catch (error) {
          setStatus((error as Error).message);
        } finally {
          setBusy((b) => ({ ...b, [key]: false }));
        }
      }),
    );
    if (extra > 0) {
      setStatus(`${extra} файл(а) не поместились: в схеме нет свободных ячеек`);
    }
  };

  const swap = (from: SlotRef, to: SlotRef) =>
    update((all) => {
      const a = all[from.screen].slots[from.slot] ?? null;
      const b = all[to.screen].slots[to.slot] ?? null;
      all[from.screen].slots[from.slot] = b;
      all[to.screen].slots[to.slot] = a;
      return all;
    });

  const save = async () => {
    setStatus("Сохраняю и нарезаю картинки…");
    try {
      const res = await fetch("/__admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, screens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить");
      setScreens(data.screens);
      setDirty(false);
      setStatus("Сохранено");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const reset = () => {
    setScreens(initialScreens(item));
    setDirty(false);
    setStatus(null);
  };

  if (!isDev) {
    return (
      <main className="admin-off">
        Админка кейсов работает только локально: <code>npm run dev</code>.
      </main>
    );
  }

  return (
    <div className="admin">
      <aside className="admin-cases">
        <p className="admin-brand">
          Всё так<span>.</span> кейсы
        </p>
        {directions.map((direction) => (
          <section key={direction.id}>
            <h2>{direction.title}</h2>
            {direction.cases.map((c) => {
              const thumb = firstImage(c);
              return (
                <button
                  type="button"
                  key={c.slug}
                  className={`admin-case${c.slug === slug ? " is-active" : ""}`}
                  onClick={() => selectCase(c.slug)}
                >
                  {thumb ? <img src={thumb} alt="" /> : <span className="admin-case-empty" />}
                  <span>{c.title}</span>
                  {savedScreensFor(c.slug) && <em>{savedScreensFor(c.slug)!.length}</em>}
                </button>
              );
            })}
          </section>
        ))}
      </aside>

      <main className="admin-main">
        <header className="admin-bar">
          <div>
            <h1>{item.title}</h1>
            <p>
              {item.client} · {item.year} ·{" "}
              <a href={`/#${slug}`} target="_blank" rel="noreferrer">
                открыть кейс ↗
              </a>
            </p>
          </div>
          <div className="admin-actions">
            {status && <span className="admin-status">{status}</span>}
            <button type="button" onClick={reset} disabled={!dirty}>
              Отменить
            </button>
            <button type="button" className="is-primary" onClick={save} disabled={!dirty}>
              Сохранить
            </button>
          </div>
        </header>

        <p className="admin-hint">
          Перетащите картинки из Finder в ячейки. Картинку внутри ячейки двигайте мышью — так
          выбирается кадр. За ⠿ ячейки можно менять местами, в том числе между экранами. При
          сохранении картинки режутся под пропорции ячейки и переводятся в WebP.
        </p>

        {screens.map((screen, s) => (
          <ScreenEditor
            key={s}
            index={s}
            total={screens.length}
            screen={screen}
            busy={busy}
            onLayout={(layout) =>
              update((all) => {
                all[s].layout = layout;
                delete all[s].ratio;
                return all;
              })
            }
            onMove={(delta) =>
              update((all) => {
                const [moved] = all.splice(s, 1);
                all.splice(s + delta, 0, moved);
                return all;
              })
            }
            onRemove={() =>
              window.confirm(`Удалить экран ${s + 1}?`) &&
              update((all) => {
                all.splice(s, 1);
                return all;
              })
            }
            onSlot={(slot, value) => setSlot({ screen: s, slot }, value)}
            onFiles={(slot, files) => dropFiles({ screen: s, slot }, files)}
            onSwap={(from, slot) => swap(from, { screen: s, slot })}
          />
        ))}

        <button
          type="button"
          className="admin-add"
          onClick={() =>
            update((all) => [...all, { layout: "main-2", slots: [] }])
          }
        >
          + Добавить экран
        </button>
      </main>
    </div>
  );
}

function ScreenEditor({
  index,
  total,
  screen,
  busy,
  onLayout,
  onMove,
  onRemove,
  onSlot,
  onFiles,
  onSwap,
}: {
  index: number;
  total: number;
  screen: Screen;
  busy: Record<string, boolean>;
  onLayout: (layout: string) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onSlot: (slot: number, value: Slot | null) => void;
  onFiles: (slot: number, files: File[]) => void;
  onSwap: (from: SlotRef, slot: number) => void;
}) {
  const layout = screenLayout(screen);

  return (
    <section className="admin-screen">
      <div className="admin-screen-head">
        <strong>Экран {index + 1}</strong>
        <div className="admin-layouts">
          {layout.id === "free" && (
            <span className="admin-layout is-active" title="Как есть — картинка без кадрирования">
              как есть
            </span>
          )}
          {layouts.map((l) => (
            <button
              type="button"
              key={l.id}
              title={l.title}
              className={`admin-layout${l.id === screen.layout ? " is-active" : ""}`}
              onClick={() => onLayout(l.id)}
            >
              <CaseScreen
                screen={{ layout: l.id, slots: [] }}
                className="case-screen admin-layout-thumb"
                renderSlot={() => null}
              />
            </button>
          ))}
        </div>
        <div className="admin-screen-tools">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="Выше">
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Ниже"
          >
            ↓
          </button>
          <button type="button" onClick={onRemove} title="Удалить экран">
            ✕
          </button>
        </div>
      </div>

      <CaseScreen
        screen={screen}
        className="case-screen admin-canvas"
        renderSlot={(slot, i) => (
          <SlotEditor
            slot={slot}
            ratio={layout.slots[i].ratio}
            busy={busy[`${index}:${i}`]}
            source={{ screen: index, slot: i }}
            onChange={(value) => onSlot(i, value)}
            onFiles={(files) => onFiles(i, files)}
            onSwap={(from) => onSwap(from, i)}
          />
        )}
      />
    </section>
  );
}

function SlotEditor({
  slot,
  ratio,
  busy,
  source,
  onChange,
  onFiles,
  onSwap,
}: {
  slot: Slot | null;
  ratio: [number, number];
  busy?: boolean;
  source: SlotRef;
  onChange: (slot: Slot | null) => void;
  onFiles: (files: File[]) => void;
  onSwap: (from: SlotRef) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pan = useRef<{ x: number; y: number; fx: number; fy: number; w: number; h: number } | null>(
    null,
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const from = e.dataTransfer.getData(SLOT_MIME);
    if (from) {
      onSwap(JSON.parse(from));
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const onPointerDown = (e: PointerEvent<HTMLImageElement>) => {
    if (!slot || slot.kind !== "image") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const [fx, fy] = slot.focus ?? [50, 50];
    pan.current = { x: e.clientX, y: e.clientY, fx, fy, w: rect.width, h: rect.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLImageElement>) => {
    const p = pan.current;
    if (!p || !slot) return;
    const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
    const fx = clamp(p.fx - ((e.clientX - p.x) / p.w) * 100);
    const fy = clamp(p.fy - ((e.clientY - p.y) / p.h) * 100);
    onChange({ ...slot, focus: [fx, fy] });
  };

  const addLink = () => {
    const url = window.prompt("Ссылка на лендинг (iframe) или видео (.mp4):");
    if (url?.trim()) onChange(slotFromUrl(url.trim()));
  };

  const preview = slot?.kind === "image" ? (slot.original ?? slot.src) : slot?.src;

  return (
    <div
      className={`admin-slot${over ? " is-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {slot?.kind === "image" && preview && (
        <img
          src={preview}
          alt=""
          draggable={false}
          style={{ objectPosition: `${slot.focus?.[0] ?? 50}% ${slot.focus?.[1] ?? 50}%` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (pan.current = null)}
        />
      )}
      {slot && slot.kind !== "image" && (
        <div className="admin-slot-link">
          <span>{slot.kind === "cover" ? "обложка-заглушка" : slot.kind}</span>
          <code>{slot.src}</code>
        </div>
      )}
      {!slot && (
        <div className="admin-slot-empty">
          <span>
            {ratio[0]}:{ratio[1]}
          </span>
          <button type="button" onClick={() => input.current?.click()}>
            выбрать файл
          </button>
          <button type="button" onClick={addLink}>
            ссылка
          </button>
        </div>
      )}
      {slot && (
        <div className="admin-slot-tools">
          <span
            className="admin-grip"
            draggable
            title="Перетащите, чтобы поменять ячейки местами"
            onDragStart={(e) => e.dataTransfer.setData(SLOT_MIME, JSON.stringify(source))}
          >
            ⠿
          </span>
          <button type="button" onClick={() => input.current?.click()} title="Заменить">
            ⟳
          </button>
          <button type="button" onClick={() => onChange(null)} title="Очистить">
            ✕
          </button>
        </div>
      )}
      {busy && <div className="admin-slot-busy">Загрузка…</div>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
