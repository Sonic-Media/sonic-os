import { redirect } from "next/navigation";

export default function ExpenseCategoriesRedirectPage() {
  redirect("/settings/expense-settings");
}
