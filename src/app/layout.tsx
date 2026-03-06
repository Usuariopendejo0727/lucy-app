import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Lucy — Asistente IA de IntegroSuite",
  description:
    "Lucy es tu asistente de inteligencia artificial especializada en IntegroSuite. Resuelve dudas y aprende a usar tu CRM de manera eficiente.",
  keywords: ["IntegroSuite", "CRM", "asistente IA", "GoHighLevel", "Lucy", "Colombia"],
  openGraph: {
    title: "Lucy — Asistente IA de IntegroSuite",
    description: "Tu asistente experta en IntegroSuite. Pregúntame lo que necesites.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${onest.variable} ${onest.className}`}>
        {children}
      </body>
    </html>
  );
}
