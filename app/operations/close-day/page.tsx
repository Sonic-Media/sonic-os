import { redirect } from "next/navigation";

export default function CloseDayPage() {
  redirect("/operations/today");
}
