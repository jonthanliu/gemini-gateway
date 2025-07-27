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
import { useEffect, useState } from "react";
import { getDetailedApiCallStats } from "./actions";

type Log = {
  id: number;
  apiKey: string;
  model: string;
  statusCode: number;
  isSuccess: boolean;
  createdAt: Date | null;
};

type Stats = {
  total: number;
  success: number;
  failed: number;
};

type TimeFrame = "1m" | "1h" | "24h";

interface ApiCallStatsDetailProps {
  timeframe: TimeFrame;
  dictionary: Dictionary["apiCallDetails"];
}

export function ApiCallStatsDetail({
  timeframe,
  dictionary,
}: ApiCallStatsDetailProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    failed: 0,
  });

  useEffect(() => {
    getDetailedApiCallStats(timeframe).then((result) => {
      if (result.logs && result.stats) {
        setLogs(result.logs);
        setStats(result.stats);
      }
      setLoading(false);
    });
  }, [timeframe]);

  if (loading) {
    return <p>{dictionary.loading}</p>;
  }

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
              <TableHead>{dictionary.keyEnd}</TableHead>
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
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.createdAt?.toLocaleTimeString() ?? "N/A"}
                  </TableCell>
                  <TableCell>...{log.apiKey.slice(-4)}</TableCell>
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
