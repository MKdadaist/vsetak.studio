const intro = "Привет, я Марк Калинин.";

const services = [
  "Айдентика и брендбуки",
  "Сайты и цифровые сервисы",
  "Дизайн-системы",
  "Данные, автоматизация и ИИ",
];

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Всё так — в начало">
          Всё так<span className="wordmark-dot">.</span>
        </a>

        <p className="eyebrow">Студия цифровых продуктов</p>
      </header>

      <section className="hero" id="top" aria-labelledby="intro-heading">
        <h1 className="intro" id="intro-heading" aria-label={intro}>
          <span className="sr-only">{intro}</span>
          <span className="typewriter" aria-hidden="true">
            {Array.from(intro).map((character, index) => (
              <span
                className="typewriter-character"
                style={{ "--character-index": index } as React.CSSProperties}
                key={`${character}-${index}`}
              >
                {character === " " ? "\u00A0" : character}
              </span>
            ))}
            <span className="typewriter-caret" />
          </span>
        </h1>

        <div className="hero-copy">
          <p className="lead">
            «Всё так» — студия дизайна и разработки цифровых продуктов.
          </p>
          <p>
            Создаём айдентику, фирменные стили и брендбуки. Проектируем сайты,
            сервисы и интерфейсы. Разрабатываем дизайн-системы и интегрируем их
            в цифровые продукты.
          </p>
          <p>
            Работаем с данными, автоматизацией и искусственным интеллектом.
            Собираем под конкретные задачи бизнеса цельные системы — от идеи и
            визуального языка до работающего продукта.
          </p>
        </div>
      </section>

      <section className="capabilities" aria-label="Направления работы">
        <p className="section-label">Что делаем</p>
        <ul>
          {services.map((service, index) => (
            <li key={service}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {service}
            </li>
          ))}
        </ul>
      </section>

      <footer className="site-footer">
        <p className="footer-statement">
          Дизайн, технологии и здравый смысл.
          <br />
          Чтобы всё было так.
        </p>

        <div className="footer-contact">
          <p>Есть задача?</p>
          <a href="mailto:hello@vsetak.studio">hello@vsetak.studio</a>
        </div>

        <p className="copyright">© {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
