import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import "./globals.css";
export const metadata: Metadata = {
  title: `${brand.name} | Command Center`,
  description: brand.description,
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
