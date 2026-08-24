import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/shared/layout/app-shell";
import { CommandPaletteProvider } from "@/context/command-palette-context";
import { ToastProvider } from "@/context/toast-context";
import { EntriesProvider } from "@/context/entries-context";
import { ExpenseTemplatesProvider } from "@/context/expense-templates-context";
import { AuthProvider } from "@/context/auth-context";
import { BranchesProvider } from "@/context/branches-context";
import { ActiveBranchProvider } from "@/context/active-branch-context";
import { StockProvider } from "@/context/stock-context";
import { SalesProvider } from "@/context/sales-context";
import { PurchasingProvider } from "@/context/purchasing-context";
import { ExpensesModuleProvider } from "@/context/expenses-module-context";
import { StaffPaymentsProvider } from "@/context/staff-payments-context";
import { DayClosingProvider } from "@/context/day-closing-context";
import { AuditLogProvider } from "@/context/audit-log-context";
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
          <AuditLogProvider>
          <BranchesProvider>
          <ActiveBranchProvider>
          <ExpenseTemplatesProvider>
            <StaffProvider>
              <EntriesProvider>
                <StockProvider>
                  <SalesProvider>
                    <PurchasingProvider>
                      <ExpensesModuleProvider>
                        <StaffPaymentsProvider>
                        <DayClosingProvider>
                        <CommandPaletteProvider>
                          <ToastProvider>
                            <AppShell>{children}</AppShell>
                          </ToastProvider>
                        </CommandPaletteProvider>
                        </DayClosingProvider>
                        </StaffPaymentsProvider>
                      </ExpensesModuleProvider>
                    </PurchasingProvider>
                  </SalesProvider>
                </StockProvider>
              </EntriesProvider>
            </StaffProvider>
          </ExpenseTemplatesProvider>
          </ActiveBranchProvider>
          </BranchesProvider>
          </AuditLogProvider>
        </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
