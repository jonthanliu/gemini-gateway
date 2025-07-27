"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { formatApiKey } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  DetailedApiCallStats,
  getDetailedApiCallStatsAction,
} from "../actions/key.action";

type TimeFrame = "1m" | "1h" | "24h";

// This component only needs the 'usage' dictionary.
type ApiCallStatsDetailDictionary =
  Dictionary["admin"]["keys"]["table"]["usage"];

interface ApiCallStatsDetailProps {
  timeframe: TimeFrame;
  dictionary: ApiCallStatsDetailDictionary;
}

export function ApiCallStatsDetail({
  timeframe,
  dictionary,
}: ApiCallStatsDetailProps) {
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
    return <p>{dictionary.loading}</p>;
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
          <p className="text-sm text-muted-foreground">
            {dictionary.totalCalls}
          </p>
        </div>
        <div>
          <p className="text-xl font-bold text-green-600">{stats.success}</p>
          <p className="text-sm text-muted-foreground">{dictionary.success}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-sm text-muted-foreground">{dictionary.failed}</p>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dictionary.time}</TableHead>
              <TableHead>Key</TableHead>{" "}
              {/* Assuming generic 'Key' from another part of dict */}
              <TableHead>{dictionary.model}</TableHead>
              <TableHead>{dictionary.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  {dictionary.noLogs}
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
                      <span className="text-green-600">
                        {dictionary.success}
                      </span>
                    ) : (
                      <span className="text-red-600">
                        {dictionary.failed} ({log.statusCode})
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
