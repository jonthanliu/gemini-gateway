import { i18n, Locale } from "@/i18n-config";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return (
    <DictionaryProvider dictionary={dictionary}>{children}</DictionaryProvider>
  );
}
