// Architectural Decision:
// The KeyUsageDetail component is a client-side component designed to fetch and display
// detailed usage information for a single API key. It is rendered within a dialog.
//
// Implementation Details:
// - It is a "use client" component because it uses the `useEffect` and `useState` hooks
//   to manage its own data fetching lifecycle and state (loading, error, details).
// - Data is fetched via a dedicated Server Action (`getKeyUsageDetailsAction`) when the component
//   mounts or when the `apiKey` prop changes. This encapsulates data fetching logic within
//   the component itself.
// - It handles loading, error, and no-data states gracefully, providing clear feedback to the user.
// - The component is composed of two main parts: a summary statistics section and a table of
//   recent request logs, offering a comprehensive overview of the key's activity.

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
import { useEffect, useState } from "react";
import {
  getKeyUsageDetailsAction,
  KeyUsageDetails,
} from "../actions/key.action";

interface KeyUsageDetailProps {
  apiKey: string;
}

export function KeyUsageDetail({ apiKey }: KeyUsageDetailProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.keys.table.usage;
  const [details, setDetails] = useState<KeyUsageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;

    setLoading(true);
    getKeyUsageDetailsAction(apiKey)
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setDetails(result.data ?? null);
        }
      })
      .catch((e) => {
        setError(e.message || dict.error);
      })
      .finally(() => setLoading(false));
  }, [apiKey, dict.error]);

  if (loading) return <p>{dict.loading}</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!details) return <p>{dict.noDetails}</p>;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xl font-bold">{details.stats.total}</p>
          <p className="text-sm text-muted-foreground">{dict.totalCalls}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-green-600">
            {details.stats.success}
          </p>
          <p className="text-sm text-muted-foreground">{dict.success}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-600">
            {details.stats.failed}
          </p>
          <p className="text-sm text-muted-foreground">{dict.failed}</p>
        </div>
      </div>
      <h4 className="mb-2 font-semibold">{dict.recentLogs}</h4>
      <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.time}</TableHead>
              <TableHead>{dict.model}</TableHead>
              <TableHead>{dict.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  {dict.noLogs}
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
