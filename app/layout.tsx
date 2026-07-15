import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { EntriesProvider } from "@/context/entries-context";
import { ExpenseTemplatesProvider } from "@/context/expense-templates-context";
import { SettingsProvider } from "@/context/settings-context";
import { StaffProvider } from "@/context/staff-context";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sonic OS",
  description: "Business operating system for Sonic movie stores",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sonic OS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} dark h-full`}>
      <body className="min-h-full bg-black text-white font-sans antialiased">
        <SettingsProvider>
          <ExpenseTemplatesProvider>
            <StaffProvider>
              <EntriesProvider>
                <main className="min-h-full">{children}</main>
                <BottomNav />
              </EntriesProvider>
            </StaffProvider>
          </ExpenseTemplatesProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
