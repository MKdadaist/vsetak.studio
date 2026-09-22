"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  directions,
  findCase,
  firstImage,
  nextCase,
  type CaseItem,
} from "../cases";
import { CaseBlocks } from "./CaseBlocks";
import { CaseCover } from "./CaseCover";

const emptySubscribe = () => () => {};

function slugFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const slug = window.location.hash.replace(/^#/, "");
  return slug && findCase(slug) ? slug : null;
}

export function WorkDeck() {
  const [openDirection, setOpenDirection] = useState<string | null>(
    directions[0]?.id ?? null,
  );
  const [activeSlug, setActiveSlug] = useState<string | null>(() =>
    slugFromHash(),
  );
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const paneRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const activeCase = activeSlug ? findCase(activeSlug) : undefined;
  const followingCase = activeSlug ? nextCase(activeSlug) : undefined;

  const openCase = useCallback((slug: string, pushHistory = true) => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (pushHistory) {
      window.history.pushState(null, "", `#${slug}`);
    }
    setActiveSlug(slug);
  }, []);

  const closeCase = useCallback((pushHistory = true) => {
    if (pushHistory && window.location.hash) {
      window.history.pushState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    setActiveSlug(null);
    returnFocusRef.current?.focus();
  }, []);

  // Синхронизация с кнопками браузера «назад/вперёд».
  useEffect(() => {
    const onPopState = () => {
      const slug = slugFromHash();
      if (slug) {
        setActiveSlug(slug);
      } else {
        setActiveSlug(null);
        returnFocusRef.current?.focus();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Класс на <html> двигает главную страницу и панель кейса, блокирует скролл.
  useEffect(() => {
    const root = document.documentElement;
    if (activeSlug) {
      root.classList.add("case-open");
      paneRef.current?.scrollTo({ top: 0 });
      backRef.current?.focus({ preventScroll: true });
    } else {
      root.classList.remove("case-open");
    }
    return () => root.classList.remove("case-open");
  }, [activeSlug]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeSlug) closeCase();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlug, closeCase]);

  return (
    <section className="work" id="work" aria-label="Кейсы по направлениям">
      <p className="section-label">Что делаем</p>

      <div className="work-list">
        {directions.map((direction, index) => {
          const isOpen = openDirection === direction.id;
          return (
            <div
              className={`work-direction${isOpen ? " is-open" : ""}`}
              key={direction.id}
            >
              <h2 className="work-heading">
                <button
                  type="button"
                  className="work-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`direction-${direction.id}`}
                  onClick={() =>
                    setOpenDirection(isOpen ? null : direction.id)
                  }
                >
                  <span className="work-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="work-title">{direction.title}</span>
                  <span className="work-count">
                    {direction.cases.length}
                  </span>
                  <span className="work-plus" aria-hidden="true" />
                </button>
              </h2>

              <div
                className="work-body"
                id={`direction-${direction.id}`}
                inert={!isOpen}
              >
                <div className="work-body-inner">
                  <p className="work-note">{direction.note}</p>
                  <ul className="case-list">
                    {direction.cases.map((item) => (
                      <li key={item.slug}>
                        <button
                          type="button"
                          className="case-card"
                          onClick={() => openCase(item.slug)}
                        >
                          <CaseThumb item={item} />
                          <span className="case-card-text">
                            <span className="case-card-title">
                              {item.title}
                            </span>
                            <span className="case-card-meta">
                              {item.client} · {item.year}
                              {item.status && (
                                <span className="case-status">
                                  {" "}
                                  · {item.status}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="case-card-arrow" aria-hidden="true">
                            →
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mounted &&
        createPortal(
          <div
            className="case-pane"
            ref={paneRef}
            role="dialog"
            aria-modal="true"
            aria-hidden={!activeCase}
            aria-label={activeCase ? activeCase.title : "Кейс"}
          >
            {activeCase && (
              <CasePaneContent
                key={activeCase.slug}
                item={activeCase}
                following={followingCase}
                backRef={backRef}
                onBack={() => closeCase()}
                onNext={(slug) => openCase(slug)}
              />
            )}
          </div>,
          document.body,
        )}
    </section>
  );
}

// Превью карточки: первая картинка из медиа кейса, иначе абстрактная обложка.
function CaseThumb({ item }: { item: CaseItem }) {
  const image = firstImage(item);
  if (image) {
    return (
      <img
        className="case-card-cover"
        src={image}
        alt=""
        loading="lazy"
      />
    );
  }
  return <CaseCover variant={item.cover} className="case-card-cover" />;
}

function CasePaneContent({
  item,
  following,
  backRef,
  onBack,
  onNext,
}: {
  item: CaseItem;
  following?: CaseItem;
  backRef: React.RefObject<HTMLButtonElement | null>;
  onBack: () => void;
  onNext: (slug: string) => void;
}) {
  return (
    <article className="case-page">
      <header className="case-header">
        <button
          type="button"
          className="case-back"
          ref={backRef}
          onClick={onBack}
        >
          <span aria-hidden="true">←</span> Назад
        </button>
        <p className="case-header-meta">
          {item.client} · {item.year}
        </p>
      </header>

      <CaseBlocks item={item} />

      {following && (
        <footer className="case-next">
          <p className="case-next-label">Следующий кейс</p>
          <button
            type="button"
            className="case-next-link"
            onClick={() => onNext(following.slug)}
          >
            {following.title} <span aria-hidden="true">→</span>
          </button>
        </footer>
      )}
    </article>
  );
}
