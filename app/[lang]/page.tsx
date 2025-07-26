import { Locale } from "@/i18n-config";
import { redirect } from "next/navigation";

export default async function RootPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/admin`);
}
