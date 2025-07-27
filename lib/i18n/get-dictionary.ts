import type { Locale } from "@/i18n-config";
import "server-only";

const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((module) => module.default),
  zh: () => import("@/dictionaries/zh.json").then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  return locale && dictionaries[locale]
    ? await dictionaries[locale]()
    : await dictionaries.en();
};
