import type { Metadata } from "next";
import "./globals.css";
import "../styles/cr-design-system.css";
import { CommonRoomIconSymbols } from "@/components/cr/Icon";

export const metadata: Metadata = {
  title: "Schoomate",
  description: "Schoomate web application",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <CommonRoomIconSymbols />
        {children}
      </body>
    </html>
  );
}
