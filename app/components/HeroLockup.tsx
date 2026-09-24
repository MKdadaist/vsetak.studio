"use client";

import { useEffect, useRef } from "react";

// Композиция заглушки: буквы и фигура — отдельные слои,
// они чуть расходятся от курсора и при прокрутке.
export function HeroLockup() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scroll = 0;

    const paint = () => {
      frame = 0;
      node.style.setProperty("--px", pointerX.toFixed(3));
      node.style.setProperty("--py", pointerY.toFixed(3));
      node.style.setProperty("--sy", scroll.toFixed(3));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    const onPointerMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      pointerX = (event.clientX - (box.left + box.width / 2)) / box.width;
      pointerY = (event.clientY - (box.top + box.height / 2)) / box.height;
      schedule();
    };

    const onScroll = () => {
      const box = node.getBoundingClientRect();
      const middle = box.top + box.height / 2;
      scroll = (window.innerHeight / 2 - middle) / window.innerHeight;
      schedule();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hero-lockup" ref={ref} aria-hidden="false">
      <img
        className="hero-lockup-type"
        src="/hero/vse-tak.webp"
        alt=""
        width={1200}
        height={1668}
      />
      <img
        className="hero-lockup-figure"
        src="/hero/mark.webp"
        alt="Марк Калинин"
        width={1200}
        height={1857}
      />
    </div>
  );
}
