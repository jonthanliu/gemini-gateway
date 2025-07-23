"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { getKeyUsageDetails } from "./actions";

type Log = {
  id: number;
  model: string;
  statusCode: number;
  isSuccess: boolean;
  createdAt: Date | null;
};

type Details = {
  stats: {
    total: number;
    success: number;
    failed: number;
  };
  logs: Log[];
};

import { Dictionary } from "@/lib/dictionaries";

interface KeyUsageDetailProps {
  apiKey: string;
  dictionary: Dictionary["keys"]["table"]["usage"];
}

export function KeyUsageDetail({ apiKey, dictionary }: KeyUsageDetailProps) {
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;

    setLoading(true);
    getKeyUsageDetails(apiKey)
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setDetails({ stats: result.stats, logs: result.logs });
        }
      })
      .finally(() => setLoading(false));
  }, [apiKey]);

  if (loading) return <p>{dictionary.loading}</p>;
  if (error)
    return (
      <p className="text-red-500">
        {dictionary.error}: {error}
      </p>
    );
  if (!details) return <p>{dictionary.noDetails}</p>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <p className="text-xl font-bold">{details.stats.total}</p>
          <p className="text-sm text-muted-foreground">
            {dictionary.totalCalls}
          </p>
        </div>
        <div>
          <p className="text-xl font-bold text-green-600">
            {details.stats.success}
          </p>
          <p className="text-sm text-muted-foreground">{dictionary.success}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-600">
            {details.stats.failed}
          </p>
          <p className="text-sm text-muted-foreground">{dictionary.failed}</p>
        </div>
      </div>
      <h4 className="font-semibold mb-2">{dictionary.recentLogs}</h4>
      <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dictionary.time}</TableHead>
              <TableHead>{dictionary.model}</TableHead>
              <TableHead>{dictionary.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  {dictionary.noLogs}
                </TableCell>
              </TableRow>
            ) : (
              details.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.createdAt?.toLocaleString() ?? "N/A"}
                  </TableCell>
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
