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
import { Dictionary } from "@/lib/i18n/dictionaries";
import { useEffect, useState } from "react";
import { getDetailedKeyStats } from "./actions";

type ApiKeyDetail = {
  key: string;
  enabled: boolean;
  failCount: number;
  createdAt: Date | null;
  lastUsed: Date | null;
};

export function KeyStatsDetail({
  dictionary,
}: {
  dictionary: Dictionary["keyDetails"];
}) {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKeyDetail[]>([]);

  useEffect(() => {
    getDetailedKeyStats().then((result) => {
      if (result.allKeys) {
        setKeys(result.allKeys);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p>{dictionary.loading}</p>;
  }

  const enabledKeys = keys.filter((k) => k.enabled);
  const invalidKeys = keys.filter((k) => !k.enabled);

  const renderKeyTable = (keys: ApiKeyDetail[]) => (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dictionary.keyEnd}</TableHead>
            <TableHead>{dictionary.failCount}</TableHead>
            <TableHead>{dictionary.lastUsed}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
                {dictionary.noKeys}
              </TableCell>
            </TableRow>
          ) : (
            keys.map((key) => (
              <TableRow key={key.key}>
                <TableCell>...{key.key.slice(-4)}</TableCell>
                <TableCell>{key.failCount}</TableCell>
                <TableCell>
                  {key.lastUsed?.toLocaleString() ?? dictionary.never}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Tabs defaultValue="enabled">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="enabled">
          {dictionary.enabled} ({enabledKeys.length})
        </TabsTrigger>
        <TabsTrigger value="invalid">
          {dictionary.invalid} ({invalidKeys.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="enabled">{renderKeyTable(enabledKeys)}</TabsContent>
      <TabsContent value="invalid">{renderKeyTable(invalidKeys)}</TabsContent>
    </Tabs>
  );
}
