"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { getSystemApiCallStats } from "@/lib/services/key.service";
import { ApiCallStatsDetail } from "./ApiCallStatsDetail";
import { KeyStatsDetail } from "./KeyStatsDetail";

interface KeyStats {
  total: number;
  active: number;
  inactive: number;
}

type SystemStats = Awaited<ReturnType<typeof getSystemApiCallStats>>;

interface DashboardStatsProps {
  keyStats: KeyStats;
  systemStats: SystemStats;
}

export function DashboardStats({ keyStats, systemStats }: DashboardStatsProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md">
            <CardHeader>
              <CardTitle>{dict.dashboard.keyStatsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{keyStats.total}</p>
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.totalKeys}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {keyStats.active}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.activeKeys}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {keyStats.inactive}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.inactiveKeys}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dict.dashboard.detailedKeyStats}</DialogTitle>
          </DialogHeader>
          <KeyStatsDetail />
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md">
            <CardHeader>
              <CardTitle>{dict.dashboard.apiCallStatsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{systemStats["1m"].total}</p>
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.last1m}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats["1h"].total}</p>
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.last1h}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats["24h"].total}</p>
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.last24h}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dict.dashboard.detailedApiCallStats}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="24h" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="1m">{dict.dashboard.last1m}</TabsTrigger>
              <TabsTrigger value="1h">{dict.dashboard.last1h}</TabsTrigger>
              <TabsTrigger value="24h">{dict.dashboard.last24h}</TabsTrigger>
            </TabsList>
            <TabsContent value="1m">
              <ApiCallStatsDetail timeframe="1m" />
            </TabsContent>
            <TabsContent value="1h">
              <ApiCallStatsDetail timeframe="1h" />
            </TabsContent>
            <TabsContent value="24h">
              <ApiCallStatsDetail timeframe="24h" />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
