"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Eye } from "lucide-react";

type RequestLog = {
  id: number;
  createdAt: Date | null;
  apiKey: string;
  model: string;
  statusCode: number;
  latency: number;
};

type ErrorLog = {
  id: number;
  createdAt: Date | null;
  apiKey: string | null;
  errorType: string;
  errorMessage: string;
};

type Log = RequestLog | ErrorLog;

interface LogTableProps {
  logs: Log[];
  logType: "request" | "error";
  selectedLogIds: Set<number>;
  onLogSelectionChange: (logId: number, isSelected: boolean) => void;
  onSelectAllLogsChange: (allSelected: boolean) => void;
  onViewLog: (log: Log) => void;
  dictionary: Dictionary["logs"];
}

export function LogTable({
  logs,
  logType,
  selectedLogIds,
  onLogSelectionChange,
  onSelectAllLogsChange,
  onViewLog,
  dictionary,
}: LogTableProps) {
  const areAllLogsSelected =
    logs.length > 0 && selectedLogIds.size === logs.length;

  const renderLogCells = (log: Log) => {
    if (logType === "request" && "statusCode" in log) {
      return (
        <>
          <TableCell>{formatApiKey(log.apiKey)}</TableCell>
          <TableCell>{log.model}</TableCell>
          <TableCell>{log.statusCode}</TableCell>
          <TableCell>{log.latency}ms</TableCell>
        </>
      );
    }
    if (logType === "error" && "errorType" in log) {
      return (
        <>
          <TableCell>{formatApiKey(log.apiKey ?? "")}</TableCell>
          <TableCell>{log.errorType}</TableCell>
          <TableCell className="max-w-xs truncate">
            {log.errorMessage}
          </TableCell>
        </>
      );
    }
    return null;
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={areAllLogsSelected}
                onCheckedChange={(checked) =>
                  onSelectAllLogsChange(Boolean(checked))
                }
              />
            </TableHead>
            <TableHead>{dictionary.columns.timestamp}</TableHead>
            {logType === "request" ? (
              <>
                <TableHead>{dictionary.columns.apiKey}</TableHead>
                <TableHead>{dictionary.columns.model}</TableHead>
                <TableHead>{dictionary.columns.status}</TableHead>
                <TableHead>{dictionary.columns.latency}</TableHead>
              </>
            ) : (
              <>
                <TableHead>{dictionary.columns.apiKey}</TableHead>
                <TableHead>{dictionary.columns.errorType}</TableHead>
                <TableHead>{dictionary.columns.errorMessage}</TableHead>
              </>
            )}
            <TableHead className="text-right">
              {dictionary.columns.actions}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              data-state={selectedLogIds.has(log.id) && "selected"}
            >
              <TableCell>
                <Checkbox
                  checked={selectedLogIds.has(log.id)}
                  onCheckedChange={(checked) =>
                    onLogSelectionChange(log.id, Boolean(checked))
                  }
                />
              </TableCell>
              <TableCell>
                {log.createdAt
                  ? new Date(log.createdAt).toLocaleString()
                  : "N/A"}
              </TableCell>
              {renderLogCells(log)}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewLog(log)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
