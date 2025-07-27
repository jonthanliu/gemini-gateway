
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
import { Dictionary } from "@/lib/i18n/dictionaries";
import { getSystemApiCallStats } from "@/lib/services/key.service";
import { ApiCallStatsDetail } from "./ApiCallStatsDetail";
import { KeyStatsDetail } from "./KeyStatsDetail";

interface KeyStats {
  total: number;
  active: number;
  inactive: number;
}

type SystemStats = Awaited<ReturnType<typeof getSystemApiCallStats>>;

// This component's dictionary needs to satisfy itself AND its children.
// So we intersect the required types.
type DashboardStatsDictionary = Dictionary["admin"]["dashboard"] &
  Dictionary["admin"]["keys"]["table"] &
  Dictionary["admin"]["keys"]["table"]["usage"];

interface DashboardStatsProps {
  keyStats: KeyStats;
  systemStats: SystemStats;
  dictionary: DashboardStatsDictionary;
}

export function DashboardStats({
  keyStats,
  systemStats,
  dictionary,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md">
            <CardHeader>
              <CardTitle>{dictionary.keyStatsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{keyStats.total}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.totalKeys}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {keyStats.active}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.activeKeys}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {keyStats.inactive}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.inactiveKeys}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dictionary.detailedKeyStats}</DialogTitle>
          </DialogHeader>
          <KeyStatsDetail dictionary={dictionary} />
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md">
            <CardHeader>
              <CardTitle>{dictionary.apiCallStatsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{systemStats["1m"].total}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.last1m}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats["1h"].total}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.last1h}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats["24h"].total}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.last24h}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dictionary.detailedApiCallStats}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="24h" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="1m">{dictionary.last1m}</TabsTrigger>
              <TabsTrigger value="1h">{dictionary.last1h}</TabsTrigger>
              <TabsTrigger value="24h">{dictionary.last24h}</TabsTrigger>
            </TabsList>
            <TabsContent value="1m">
              <ApiCallStatsDetail
                timeframe="1m"
                dictionary={dictionary}
              />
            </TabsContent>
            <TabsContent value="1h">
              <ApiCallStatsDetail
                timeframe="1h"
                dictionary={dictionary}
              />
            </TabsContent>
            <TabsContent value="24h">
              <ApiCallStatsDetail
                timeframe="24h"
                dictionary={dictionary}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
