import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Poppins é a família tipográfica oficial da marca (Manual da Marca, seção 09).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Triângulo Gestor",
  description:
    "Gestão da produção de conteúdo da Triângulo Solucions. Mapear. Resolver. Lucrar.",
  icons: { icon: "/brand/simbolo-vermelho.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
