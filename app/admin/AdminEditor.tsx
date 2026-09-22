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
  findAnyCase,
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

const isDev = process.env.NODE_ENV !== "production";

type SlotRef = { screen: number; slot: number };

type DragState = {
  from: SlotRef;
  slot: Slot;
  x: number;
  y: number;
  over: SlotRef | null;
};

const refKey = (ref: SlotRef) => `${ref.screen}:${ref.slot}`;

function slotAt(x: number, y: number): SlotRef | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-slot]");
  if (!el?.dataset.slot) return null;
  const [screen, slot] = el.dataset.slot.split(":").map(Number);
  return { screen, slot };
}

function swapped(screens: Screen[], a: SlotRef, b: SlotRef): Screen[] {
  const next = structuredClone(screens);
  const first = next[a.screen].slots[a.slot] ?? null;
  next[a.screen].slots[a.slot] = next[b.screen].slots[b.slot] ?? null;
  next[b.screen].slots[b.slot] = first;
  return next;
}

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
  const item = findAnyCase(slug)!;
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
    setScreens(initialScreens(findAnyCase(next)!));
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

  // Перетаскивание фото между ячейками: пока фото над ячейкой, её фото
  // уже стоит на освободившемся месте; отпустили — обмен закреплён.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const startDrag = useCallback((from: SlotRef, slot: Slot, x: number, y: number) => {
    setDrag({ from, slot, x, y, over: null });
  }, []);

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    document.body.classList.add("admin-dragging");
    const move = (e: globalThis.PointerEvent) => {
      const over = slotAt(e.clientX, e.clientY);
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, over } : d));
    };
    const drop = () => {
      const d = dragRef.current;
      if (d?.over && refKey(d.over) !== refKey(d.from)) {
        const { from, over } = d;
        update((all) => swapped(all, from, over));
      }
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    const noScroll = (e: TouchEvent) => e.preventDefault();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      document.body.classList.remove("admin-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchmove", noScroll);
    };
  }, [dragging, update]);

  const preview =
    drag?.over && refKey(drag.over) !== refKey(drag.from)
      ? swapped(screens, drag.from, drag.over)
      : screens;

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
                  <span>
                    {c.title}
                    {c.hidden && <small> · скрыт</small>}
                  </span>
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
          Перетащите картинки из Finder в ячейки (на телефоне — «выбрать файл»). Фото перетаскиваются между ячейками (на телефоне — долгим
          нажатием): фото из занятой ячейки встаёт на освободившееся место, в том числе между экранами.
          Кадр внутри ячейки — кнопка ✥. При
          сохранении картинки режутся под пропорции ячейки и переводятся в WebP.
        </p>

        {preview.map((screen, s) => (
          <ScreenEditor
            key={s}
            index={s}
            total={screens.length}
            screen={screen}
            busy={busy}
            drag={drag}
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
            onStartDrag={(slot, value, x, y) => startDrag({ screen: s, slot }, value, x, y)}
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

      {drag && (
        <div className="admin-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {drag.slot.kind === "image" ? (
            <img src={drag.slot.original ?? drag.slot.src} alt="" />
          ) : (
            <span>{drag.slot.kind}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenEditor({
  index,
  total,
  screen,
  busy,
  drag,
  onLayout,
  onMove,
  onRemove,
  onSlot,
  onFiles,
  onStartDrag,
}: {
  index: number;
  total: number;
  screen: Screen;
  busy: Record<string, boolean>;
  drag: DragState | null;
  onLayout: (layout: string) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onSlot: (slot: number, value: Slot | null) => void;
  onFiles: (slot: number, files: File[]) => void;
  onStartDrag: (slot: number, value: Slot, x: number, y: number) => void;
}) {
  const layout = screenLayout(screen);
  const from = drag ? refKey(drag.from) : null;
  const over = drag?.over ? refKey(drag.over) : null;

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
        renderSlot={(slot, i) => {
          const key = `${index}:${i}`;
          return (
            <SlotEditor
              slot={slot}
              ratio={layout.slots[i].ratio}
              busy={busy[key]}
              slotKey={key}
              state={
                key === over && over !== from
                  ? "target"
                  : key === from
                    ? over && over !== from
                      ? "displaced"
                      : "origin"
                    : null
              }
              onChange={(value) => onSlot(i, value)}
              onFiles={(files) => onFiles(i, files)}
              onStartDrag={(value, x, y) => onStartDrag(i, value, x, y)}
            />
          );
        }}
      />
    </section>
  );
}

const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 350;

function SlotEditor({
  slot,
  ratio,
  busy,
  slotKey,
  state,
  onChange,
  onFiles,
  onStartDrag,
}: {
  slot: Slot | null;
  ratio: [number, number];
  busy?: boolean;
  slotKey: string;
  state: "origin" | "target" | "displaced" | null;
  onChange: (slot: Slot | null) => void;
  onFiles: (files: File[]) => void;
  onStartDrag: (slot: Slot, x: number, y: number) => void;
}) {
  const [over, setOver] = useState(false);
  const [framing, setFraming] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pan = useRef<{ x: number; y: number; fx: number; fy: number; w: number; h: number } | null>(
    null,
  );
  const press = useRef<{ x: number; y: number; timer: number; touch: boolean } | null>(null);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  useEffect(() => cancelPress, []);

  // Файлы из Finder — через нативный drag&drop; фото между ячейками — через указатель.
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!slot || e.button > 0) return;
    if (framing && slot.kind === "image") {
      const rect = e.currentTarget.getBoundingClientRect();
      const [fx, fy] = slot.focus ?? [50, 50];
      pan.current = { x: e.clientX, y: e.clientY, fx, fy, w: rect.width, h: rect.height };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const touch = e.pointerType !== "mouse";
    const { clientX: x, clientY: y } = e;
    press.current = {
      x,
      y,
      touch,
      // На телефоне перетаскивание начинается по долгому нажатию, чтобы не мешать прокрутке.
      timer: touch
        ? window.setTimeout(() => {
            press.current = null;
            navigator.vibrate?.(10);
            onStartDrag(slot, x, y);
          }, LONG_PRESS_MS)
        : 0,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const p = pan.current;
    if (p && slot) {
      const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
      const fx = clamp(p.fx - ((e.clientX - p.x) / p.w) * 100);
      const fy = clamp(p.fy - ((e.clientY - p.y) / p.h) * 100);
      onChange({ ...slot, focus: [fx, fy] });
      return;
    }
    const start = press.current;
    if (!start || !slot) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (start.touch) {
      if (moved > 8) cancelPress();
    } else if (moved > DRAG_THRESHOLD) {
      cancelPress();
      onStartDrag(slot, e.clientX, e.clientY);
    }
  };

  const onPointerUp = () => {
    pan.current = null;
    cancelPress();
  };

  const addLink = () => {
    const url = window.prompt("Ссылка на лендинг (iframe) или видео (.mp4):");
    if (url?.trim()) onChange(slotFromUrl(url.trim()));
  };

  const preview = slot?.kind === "image" ? (slot.original ?? slot.src) : slot?.src;
  const classes = [
    "admin-slot",
    over && "is-over",
    framing && "is-framing",
    state && `is-${state}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      data-slot={slotKey}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
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
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
      {slot && slot.kind !== "image" && (
        <div
          className="admin-slot-link"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
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
      {framing && <div className="admin-frame-hint">Двигайте кадр</div>}
      {slot && (
        <div className="admin-slot-tools">
          {slot.kind === "image" && (
            <button
              type="button"
              className={framing ? "is-active" : ""}
              onClick={() => setFraming((f) => !f)}
              title={framing ? "Готово" : "Кадр: двигать картинку внутри ячейки"}
            >
              {framing ? "✓" : "✥"}
            </button>
          )}
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
