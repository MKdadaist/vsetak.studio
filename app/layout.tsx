import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Всё так — студия цифровых продуктов",
  description:
    "Дизайн и разработка цифровых продуктов: от айдентики и брендбуков до дизайн-систем, данных и ИИ.",
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
