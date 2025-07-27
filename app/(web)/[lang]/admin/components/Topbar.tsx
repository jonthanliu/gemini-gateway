"use client";

import { Dictionary } from "@/lib/i18n/dictionaries";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { logoutAction } from "../actions/logout.action";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface TopbarProps {
  dictionary: Dictionary["admin"];
}

export function Topbar({ dictionary }: TopbarProps) {
  const pathname = usePathname();
  const lang = pathname.split("/")[1];

  const getCurrentTab = () => {
    if (pathname.endsWith("/config")) return "config";
    if (pathname.endsWith("/logs")) return "logs";
    return "dashboard";
  };

  return (
    <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <h1 className="text-xl font-semibold">{dictionary.topbar.title}</h1>
      <div className="flex-1 flex justify-center">
        <Tabs value={getCurrentTab()} className="w-auto">
          <TabsList>
            <Link href={`/${lang}/admin`} passHref>
              <TabsTrigger value="dashboard">
                {dictionary.topbar.nav.dashboard}
              </TabsTrigger>
            </Link>
            <Link href={`/${lang}/admin/config`} passHref>
              <TabsTrigger value="config">
                {dictionary.topbar.nav.config}
              </TabsTrigger>
            </Link>
            <Link href={`/${lang}/admin/logs`} passHref>
              <TabsTrigger value="logs">{dictionary.topbar.nav.logs}</TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <form action={logoutAction}>
          <Button variant="outline" size="icon" type="submit">
            <LogOut className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">{dictionary.topbar.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
