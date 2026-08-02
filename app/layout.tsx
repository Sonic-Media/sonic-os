import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/shared/layout/app-shell";
import { CommandPaletteProvider } from "@/context/command-palette-context";
import { EntriesProvider } from "@/context/entries-context";
import { ExpenseTemplatesProvider } from "@/context/expense-templates-context";
import { AuthProvider } from "@/context/auth-context";
import { BranchesProvider } from "@/context/branches-context";
import { ActiveBranchProvider } from "@/context/active-branch-context";
import { StockProvider } from "@/context/stock-context";
import { SalesProvider } from "@/context/sales-context";
import { PurchasingProvider } from "@/context/purchasing-context";
import { ExpensesModuleProvider } from "@/context/expenses-module-context";
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
        <AuthProvider>
        <SettingsProvider>
          <BranchesProvider>
          <ActiveBranchProvider>
          <ExpenseTemplatesProvider>
            <StaffProvider>
              <EntriesProvider>
                <StockProvider>
                  <SalesProvider>
                    <PurchasingProvider>
                      <ExpensesModuleProvider>
                        <CommandPaletteProvider>
                          <AppShell>{children}</AppShell>
                        </CommandPaletteProvider>
                      </ExpensesModuleProvider>
                    </PurchasingProvider>
                  </SalesProvider>
                </StockProvider>
              </EntriesProvider>
            </StaffProvider>
          </ExpenseTemplatesProvider>
          </ActiveBranchProvider>
          </BranchesProvider>
        </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
