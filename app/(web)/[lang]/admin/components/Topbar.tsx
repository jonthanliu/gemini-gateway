"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../actions/logout.action";

export function Topbar() {
  const dictionary = useDictionary();
  const dict = dictionary.admin;
  const pathname = usePathname();
  const lang = pathname.split("/")[1];

  const getCurrentTab = () => {
    if (pathname.includes("/config")) return "config";
    if (pathname.includes("/logs")) return "logs";
    if (pathname.includes("/mappings")) return "mappings";
    if (pathname.includes("/keys")) return "keys";
    return "dashboard";
  };

  return (
    <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <h1 className="text-xl font-semibold">{dict.topbar.title}</h1>
      <div className="flex-1 flex justify-center">
        <Tabs value={getCurrentTab()} className="w-auto">
          <TabsList>
            <Link href={`/${lang}/admin`} passHref>
              <TabsTrigger value="dashboard">
                {dict.topbar.nav.dashboard}
              </TabsTrigger>
            </Link>
            <Link href={`/${lang}/admin/config`} passHref>
              <TabsTrigger value="config">{dict.topbar.nav.config}</TabsTrigger>
            </Link>
            <Link href={`/${lang}/admin/logs`} passHref>
              <TabsTrigger value="logs">{dict.topbar.nav.logs}</TabsTrigger>
            </Link>
            <Link href={`/${lang}/admin/mappings`} passHref>
              <TabsTrigger value="mappings">
                {dict.topbar.nav.mappings}
              </TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <form action={logoutAction}>
          <Button variant="outline" size="icon" type="submit">
            <LogOut className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">{dict.topbar.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
