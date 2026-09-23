"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  caseBlocks,
  caseScreens,
  type BlockWidth,
  type CaseBlock,
  type CaseItem,
  type MediaItem,
} from "../cases";
import { layoutRatio, screenLayout, type Screen } from "../screens";
import { CaseCover } from "./CaseCover";
import { CaseScreen, SlotMedia } from "./CaseScreen";

export function MediaView({ m }: { m: MediaItem }) {
  if (m.kind === "cover") {
    return <CaseCover variant={m.variant ?? "rings"} className="case-media" />;
  }
  if (m.kind === "image") {
    return <img className="case-media" src={m.src} alt={m.alt ?? ""} />;
  }
  if (m.kind === "video") {
    return (
      <video
        className="case-media"
        src={m.src}
        controls
        muted
        loop
        playsInline
      />
    );
  }
  if (m.kind === "embed") {
    return (
      <iframe
        className="case-media"
        src={m.src}
        title={m.title ?? "Встроенная страница"}
        loading="lazy"
        allowFullScreen
      />
    );
  }
  return (
    <div
      className="case-media case-media-html"
      dangerouslySetInnerHTML={{ __html: m.html ?? "" }}
    />
  );
}

const phoneQuery = "(max-width: 760px)";

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(phoneQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsPhone() {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  );
}

// На телефоне экраны листаются свайпом: нативная прокрутка с привязкой к экрану.
function SwipeGallery({ screens }: { screens: Screen[] }) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = strip.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Высота ленты — по текущему экрану, чтобы под низкими экранами не было пустоты.
  useEffect(() => {
    const el = strip.current;
    const page = el?.children[index] as HTMLElement | undefined;
    if (!el || !page) return;
    const fit = () => {
      el.style.height = `${page.offsetHeight}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(page);
    return () => observer.disconnect();
  }, [index]);

  return (
    <figure className="case-gallery is-swipe">
      <div className="case-swipe" ref={strip} onScroll={onScroll}>
        {screens.map((screen, i) => (
          <div className="case-swipe-page" key={i}>
            <CaseScreen screen={screen} />
          </div>
        ))}
      </div>
      {screens.length > 1 && (
        <div className="case-swipe-dots" aria-hidden="true">
          {screens.map((_, i) => (
            <span key={i} className={i === index ? "is-active" : ""} />
          ))}
        </div>
      )}
    </figure>
  );
}

function Gallery({ screens }: { screens: Screen[] }) {
  const isPhone = useIsPhone();
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = useCallback(
    (delta: number) => {
      if (screens.length < 2 || fading) return;
      setFading(true);
      timer.current = window.setTimeout(() => {
        setIndex((i) => (i + delta + screens.length) % screens.length);
        setFading(false);
      }, 260);
    },
    [screens.length, fading],
  );

  useEffect(() => {
    if (isPhone || screens.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, isPhone, screens.length]);

  if (isPhone) return <SwipeGallery screens={screens} />;

  const current = screens[index];
  if (!current) return null;

  return (
    <figure
      className="case-gallery"
      style={
        {
          "--screen-ratio": layoutRatio(screenLayout(current)),
        } as CSSProperties
      }
    >
      <div className={`case-gallery-frame${fading ? " is-fading" : ""}`}>
        <CaseScreen screen={current} />
      </div>
      {screens.length > 1 && (
        <>
          <button
            type="button"
            className="case-gallery-arrow is-prev"
            onClick={() => go(-1)}
            aria-label="Предыдущий экран"
          >
            ←
          </button>
          <button
            type="button"
            className="case-gallery-arrow is-next"
            onClick={() => go(1)}
            aria-label="Следующий экран"
          >
            →
          </button>
          <span className="case-gallery-count">
            {index + 1} / {screens.length}
          </span>
        </>
      )}
    </figure>
  );
}

function widthClass(width: BlockWidth = "full") {
  return `case-block is-${width}`;
}

function Block({
  block,
  item,
  onOpen,
}: {
  block: CaseBlock;
  item: CaseItem;
  onOpen?: (slug: string) => void;
}) {
  const related = item.related;

  switch (block.type) {
    case "hero":
      return (
        <div className="case-hero">
          <h1 className="case-title">{item.title}</h1>
          <p className="case-summary">{item.summary}</p>
        </div>
      );

    case "gallery":
      return <Gallery screens={caseScreens(item, block.media)} />;

    case "facts":
      return (
        <dl className="case-facts">
          <div>
            <dt>Клиент</dt>
            <dd>{item.client}</dd>
          </div>
          <div className="is-year">
            <dt>Год</dt>
            <dd>{item.year}</dd>
          </div>
          <div className="is-role">
            <dt>Роль</dt>
            <dd>{item.role}</dd>
          </div>
          {item.status && (
            <div>
              <dt>Статус</dt>
              <dd>{item.status}</dd>
            </div>
          )}
          {item.link && (
            <div>
              <dt>Ссылка</dt>
              <dd>
                <a href={item.link.href} target="_blank" rel="noreferrer">
                  {item.link.label}
                </a>
              </dd>
            </div>
          )}
          {item.related && (
            <div className="is-related">
              <dt>Кейс рядом</dt>
              <dd>
                <button
                  type="button"
                  className="case-related"
                  onClick={() => onOpen?.(related.slug)}
                >
                  {related.label}
                </button>
              </dd>
            </div>
          )}
        </dl>
      );

    case "sections":
      return (
        <div className="case-body">
          {(block.items ?? item.sections).map((section) => (
            <section
              className={`case-section${section.aside ? " has-aside" : ""}`}
              key={section.heading}
            >
              <h2>{section.heading}</h2>
              {section.text.split("\n\n").map((para) => (
                <p key={para}>{para}</p>
              ))}
              {section.aside && (
                <aside className="case-aside">
                  {section.aside.image && (
                    <img
                      src={section.aside.image}
                      alt={section.aside.alt ?? ""}
                    />
                  )}
                  <p>{section.aside.text}</p>
                </aside>
              )}
            </section>
          ))}
        </div>
      );

    case "text":
      return (
        <section className={`${widthClass(block.width ?? "text")} case-text`}>
          {block.heading && <h2>{block.heading}</h2>}
          <p>{block.text}</p>
        </section>
      );

    case "media":
      return (
        <figure className={widthClass(block.width)}>
          <div
            className="case-block-frame"
            style={{ aspectRatio: block.item.ratio }}
          >
            <MediaView m={block.item} />
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case "grid":
      return (
        <figure className={widthClass(block.width)}>
          <div className={`case-grid is-cols-${block.columns ?? 2}`}>
            {block.items.map((m, i) => (
              <div
                className="case-block-frame"
                style={{ aspectRatio: m.ratio ?? "4 / 3" }}
                key={`${m.src ?? m.variant}-${i}`}
              >
                <MediaView m={m} />
              </div>
            ))}
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case "tiles": {
      const slots = caseScreens(item).flatMap((screen) => {
        const layout = screenLayout(screen);
        return layout.slots
          .map((def, i) => ({ slot: screen.slots[i], ratio: def.ratio }))
          .filter((t) => t.slot);
      });
      return (
        <div className={`case-block is-full case-tiles is-cols-${block.columns ?? 3}`}>
          <div className="case-grid">
            {slots.map(({ slot, ratio }, i) => (
              <div
                className="case-block-frame"
                style={{ aspectRatio: `${ratio[0]} / ${ratio[1]}` }}
                key={`${slot!.src}-${i}`}
              >
                <SlotMedia slot={slot!} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "quote":
      return (
        <blockquote className="case-block is-text case-quote">
          <p>{block.text}</p>
          {block.author && <cite>{block.author}</cite>}
        </blockquote>
      );

    case "divider":
      return <hr className="case-divider" />;
  }
}

export function CaseBlocks({
  item,
  onOpen,
}: {
  item: CaseItem;
  onOpen?: (slug: string) => void;
}) {
  return (
    <>
      {caseBlocks(item).map((block, i) => (
        <Block
          block={block}
          item={item}
          onOpen={onOpen}
          key={`${block.type}-${i}`}
        />
      ))}
    </>
  );
}
