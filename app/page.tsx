import { HeroLockup } from "./components/HeroLockup";

const introLines = ["Привет,", "я Марк Калинин"];
const intro = introLines.join(" ");

export default function Home() {
  return (
    <main className="site-shell is-soon">
      <header className="site-header">
        <p className="eyebrow">Контент, дизайн, концепции</p>
      </header>

      <section className="hero" id="top" aria-labelledby="intro-heading">
        <HeroLockup />

        <div className="hero-copy">
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
                          {character === " " ? " " : character}
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

          <p className="lead">
            {
              "«Всё так» — моя моностудия контента, дизайна и цифровых продуктов."
            }
          </p>
          <p>
            {
              "Создаю айдентику, фирменные стили и брендбуки. Делаю издания, каталоги и экспозиции. Проектирую сайты, сервисы и интерфейсы. Разрабатываю дизайн-системы и концепции пространств."
            }
          </p>
          <p>
            {
              "Работаю с данными, автоматизацией и искусственным интеллектом. Собираю под конкретные задачи бизнеса цельные системы — от идеи и визуального языка до работающего продукта"
            }
          </p>
        </div>
      </section>

      <section className="soon" aria-labelledby="soon-heading">
        <p className="section-label" id="soon-heading">
          Портфолио
        </p>
        <p className="soon-note">
          {
            "Кейсы откроются чуть позже. Пока\u00a0— напишите, покажу работы и\u00a0обсудим задачу."
          }
        </p>
      </section>

      <footer className="site-footer">
        <p className="footer-statement">
          Дизайн, технологии
          <br />
          {"и здравый смысл."}
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
