import { redirect } from "next/navigation";

interface LegacyNewEntryPageProps {
  searchParams: Promise<{ branch?: string }>;
}

export default async function LegacyNewEntryPage({
  searchParams,
}: LegacyNewEntryPageProps) {
  const params = await searchParams;
  const branch = params.branch ?? "salaama";
  redirect(`/operations/today?branch=${branch}`);
}
