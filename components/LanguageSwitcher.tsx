"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { i18n } from "@/i18n-config";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { Globe } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LanguageSwitcher() {
  const dictionary = useDictionary();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSwitchLanguage = (newLocale: string) => {
    // Set cookie for language preference
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // This regex looks for a locale at the beginning of the path,
    // followed by either a slash or the end of the string.
    const regex = new RegExp(`^/(${i18n.locales.join("|")})(?=/|$)`);
    const newPath = pathname.replace(regex, `/${newLocale}`);

    const queryString = searchParams.toString();
    router.push(`${newPath}${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">
            {dictionary.admin.languageSwitcher.title}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {i18n.locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSwitchLanguage(locale)}
          >
            {
              dictionary.admin.languageSwitcher[
                locale as keyof typeof dictionary.admin.languageSwitcher
              ]
            }
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
