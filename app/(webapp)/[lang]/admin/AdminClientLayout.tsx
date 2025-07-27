"use client";

import { logout } from "@/webapp/auth/actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminClientLayout({
  children,
  dictionary,
  lang,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
  lang: string;
}) {
  const pathname = usePathname();

  const getCurrentTab = () => {
    if (pathname === `/${lang}/admin/config`) return "config";
    if (pathname === `/${lang}/admin/logs`) return "logs";
    return "keys";
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        {/* Left Side */}
        <h1 className="text-xl font-semibold">{dictionary.dashboard.title}</h1>

        {/* Center */}
        <div className="flex-1 flex justify-center">
          <Tabs value={getCurrentTab()} className="w-auto">
            <TabsList>
              <Link href={`/${lang}/admin`} passHref>
                <TabsTrigger value="keys">{dictionary.nav.keys}</TabsTrigger>
              </Link>
              <Link href={`/${lang}/admin/config`} passHref>
                <TabsTrigger value="config">
                  {dictionary.nav.config}
                </TabsTrigger>
              </Link>
              <Link href={`/${lang}/admin/logs`} passHref>
                <TabsTrigger value="logs">{dictionary.nav.logs}</TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <form action={logout}>
            <Button variant="outline" size="icon" type="submit">
              <LogOut className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Logout</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
          <div className="grid gap-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
