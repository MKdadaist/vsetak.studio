import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["cyrillic", "latin"],
  variable: "--font-source-serif",
  display: "swap",
});

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
      <body className={sourceSerif.variable}>{children}</body>
    </html>
  );
}
