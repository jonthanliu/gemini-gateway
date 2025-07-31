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
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { Log } from "@/lib/services/log.service";
import { formatApiKey } from "@/lib/utils";
import { Eye } from "lucide-react";

interface LogTableProps {
  logs: Log[];
  logType: "request" | "error";
  selectedLogIds: Set<number>;
  onLogSelectionChange: (logId: number, isSelected: boolean) => void;
  onSelectAllLogsChange: (allSelected: boolean) => void;
  onViewLog: (log: Log) => void;
}

export function LogTable({
  logs,
  logType,
  selectedLogIds,
  onLogSelectionChange,
  onSelectAllLogsChange,
  onViewLog,
}: LogTableProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.logs;
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
    <div className="rounded-md border">
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
            <TableHead>{dict.columns.timestamp}</TableHead>
            {logType === "request" ? (
              <>
                <TableHead>{dict.columns.apiKey}</TableHead>
                <TableHead>{dict.columns.model}</TableHead>
                <TableHead>{dict.columns.status}</TableHead>
                <TableHead>{dict.columns.latency}</TableHead>
              </>
            ) : (
              <>
                <TableHead>{dict.columns.apiKey}</TableHead>
                <TableHead>{dict.columns.errorType}</TableHead>
                <TableHead>{dict.columns.errorMessage}</TableHead>
              </>
            )}
            <TableHead className="text-right">{dict.columns.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              data-state={selectedLogIds.has(log.id) ? "selected" : undefined}
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
