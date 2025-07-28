"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { formatApiKey } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  DetailedKeyStats,
  getDetailedKeyStatsAction,
} from "../actions/key.action";

export function KeyStatsDetail() {
  const dictionary = useDictionary();
  const tableDict = dictionary.admin.keys.table;
  const dashboardDict = dictionary.admin.dashboard;
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<DetailedKeyStats>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDetailedKeyStatsAction().then((result) => {
      if (result.data) {
        setKeys(result.data);
      } else if (result.error) {
        setError(result.error);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p>Loading...</p>; // Using a fallback, dictionary might not have this key
  }
  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  const activeKeys = keys.filter((k) => k.enabled);
  const inactiveKeys = keys.filter((k) => !k.enabled);

  const renderKeyTable = (keys: DetailedKeyStats) => (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tableDict.key}</TableHead>
            <TableHead>{tableDict.lastFailedAt}</TableHead>
            <TableHead>Created At</TableHead> {/* Fallback */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
                No keys in this category.
              </TableCell>
            </TableRow>
          ) : (
            keys.map((key) => (
              <TableRow key={key.key}>
                <TableCell>...{formatApiKey(key.key)}</TableCell>
                <TableCell>
                  {key.lastUsed?.toLocaleString() ?? "Never"}
                </TableCell>
                <TableCell>
                  {key.createdAt?.toLocaleString() ?? "N/A"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Tabs defaultValue="active">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active">
          {dashboardDict.activeKeys.replace(
            "{count}",
            activeKeys.length.toString()
          )}
        </TabsTrigger>
        <TabsTrigger value="inactive">
          {dashboardDict.inactiveKeys.replace(
            "{count}",
            inactiveKeys.length.toString()
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">{renderKeyTable(activeKeys)}</TabsContent>
      <TabsContent value="inactive">{renderKeyTable(inactiveKeys)}</TabsContent>
    </Tabs>
  );
}
