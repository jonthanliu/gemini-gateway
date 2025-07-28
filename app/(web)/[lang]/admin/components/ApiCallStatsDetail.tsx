"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { formatApiKey } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  DetailedApiCallStats,
  getDetailedApiCallStatsAction,
} from "../actions/key.action";

export function ApiCallStatsDetail({
  timeframe,
}: {
  timeframe: "1m" | "1h" | "24h";
}) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.keys.table.usage;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DetailedApiCallStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDetailedApiCallStatsAction(timeframe).then((result) => {
      if (result.data) {
        setData(result.data);
      } else if (result.error) {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [timeframe]);

  if (loading) {
    return <p>{dict.loading}</p>;
  }

  if (error || !data) {
    return <p className="text-red-500">{error || "Failed to load data."}</p>;
  }

  const { logs, stats } = data;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">{dict.totalCalls}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-green-600">{stats.success}</p>
          <p className="text-sm text-muted-foreground">{dict.success}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-sm text-muted-foreground">{dict.failed}</p>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.time}</TableHead>
              <TableHead>Key</TableHead>{" "}
              {/* Assuming generic 'Key' from another part of dict */}
              <TableHead>{dict.model}</TableHead>
              <TableHead>{dict.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  {dict.noLogs}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: DetailedApiCallStats["logs"][number]) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.createdAt?.toLocaleTimeString() ?? "N/A"}
                  </TableCell>
                  <TableCell>...{formatApiKey(log.apiKey)}</TableCell>
                  <TableCell>{log.model}</TableCell>
                  <TableCell>
                    {log.isSuccess ? (
                      <span className="text-green-600">{dict.success}</span>
                    ) : (
                      <span className="text-red-600">
                        {dict.failed} ({log.statusCode})
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
