import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Всё так — контент, дизайн, концепции",
  description:
    "Студия Марка Калинина: айдентика и брендбуки, сайты и сервисы, издания и экспозиции, концепции пространств, данные и ИИ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
