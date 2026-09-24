"use client";

import { useEffect, useRef } from "react";

// Композиция заглушки: буквы и фигура — отдельные слои.
// При прокрутке надпись уходит вверх быстрее фигуры, вбок ничего не едет.
export function HeroLockup() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const paint = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const middle = box.top + box.height / 2;
      const shift = (window.innerHeight / 2 - middle) / window.innerHeight;
      node.style.setProperty("--sy", shift.toFixed(3));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hero-lockup" ref={ref}>
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
        height={1762}
      />
    </div>
  );
}
