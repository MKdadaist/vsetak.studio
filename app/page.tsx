const introLines = ["Привет,", "я\u00A0Марк Калинин"];
const intro = introLines.join(" ");

const services = [
  "Айдентика и\u00A0брендбуки",
  "Сайты и\u00A0цифровые сервисы",
  "Дизайн-системы",
  "Данные, автоматизация и\u00A0ИИ",
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
            {introLines.map((line, lineIndex) => {
              const characterOffset = introLines
                .slice(0, lineIndex)
                .reduce((total, current) => total + current.length + 1, 0);

              return (
                <span className="typewriter-line" key={line}>
                  {Array.from(line).map((character, characterIndex) => {
                    const index = characterOffset + characterIndex;

                    return (
                      <span
                        className="typewriter-character"
                        style={
                          { "--character-index": index } as React.CSSProperties
                        }
                        key={`${character}-${index}`}
                      >
                        {character === " " ? "\u00A0" : character}
                      </span>
                    );
                  })}
                  {lineIndex === introLines.length - 1 && (
                    <span className="typewriter-caret" />
                  )}
                </span>
              );
            })}
          </span>
        </h1>

        <div className="hero-copy">
          <p className="lead">
            {"«Всё так» — студия дизайна и\u00A0разработки цифровых продуктов."}
          </p>
          <p>
            {
              "Создаём айдентику, фирменные стили и\u00A0брендбуки. Проектируем сайты, сервисы и\u00A0интерфейсы. Разрабатываем дизайн-системы и\u00A0интегрируем их в\u00A0цифровые продукты."
            }
          </p>
          <p>
            {
              "Работаем с\u00A0данными, автоматизацией и\u00A0искусственным интеллектом. Собираем под\u00A0конкретные задачи бизнеса цельные системы — от\u00A0идеи и\u00A0визуального языка до\u00A0работающего продукта"
            }
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
          {"Дизайн, технологии и\u00A0здравый смысл."}
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
