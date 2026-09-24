"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL = "hello@vsetak.studio";

// Кнопка под описанием: по клику адрес уходит в буфер обмена.
// На http-адресе в локальной сети Clipboard API недоступен — там срабатывает запасной путь.
export function MailButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(EMAIL);
      } else {
        const field = document.createElement("textarea");
        field.value = EMAIL;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  return (
    <button
      type="button"
      className={`mail-button${copied ? " is-copied" : ""}`}
      onClick={copy}
      title="Скопировать адрес"
    >
      <span className="mail-button-label" aria-live="polite">
        {copied ? "Адрес скопирован" : "Обсудить задачу"}
      </span>
      <span className="mail-button-mail">{EMAIL}</span>
    </button>
  );
}
