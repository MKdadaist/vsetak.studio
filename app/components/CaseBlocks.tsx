"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
import { CaseScreen } from "./CaseScreen";

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

function Gallery({ screens }: { screens: Screen[] }) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = (delta: number) => {
    if (screens.length < 2 || fading) return;
    setFading(true);
    timer.current = window.setTimeout(() => {
      setIndex((i) => (i + delta + screens.length) % screens.length);
      setFading(false);
    }, 260);
  };

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

function Block({ block, item }: { block: CaseBlock; item: CaseItem }) {
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

export function CaseBlocks({ item }: { item: CaseItem }) {
  return (
    <>
      {caseBlocks(item).map((block, i) => (
        <Block block={block} item={item} key={`${block.type}-${i}`} />
      ))}
    </>
  );
}
