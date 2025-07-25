"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Eye, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { clearAllLogs, deleteLogs } from "./actions";

// Types remain the same
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

import { Dictionary } from "@/lib/i18n/dictionaries";
import { formatApiKey } from "@/lib/utils";

interface LogViewerProps {
  logs: Log[];
  total: number;
  page: number;
  limit: number;
  logType: "request" | "error";
  dictionary: Dictionary["logs"];
}

export function LogViewer({
  logs,
  total,
  page,
  limit,
  logType,
  dictionary,
}: LogViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [viewingLog, setViewingLog] = useState<Log | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState(new Set<number>());

  // State for new filters
  const [apiKey, setApiKey] = useState(searchParams.get("apiKey") ?? "");
  const [errorType, setErrorType] = useState(
    searchParams.get("errorType") ?? ""
  );
  const [errorCode, setErrorCode] = useState(
    searchParams.get("errorCode") ?? ""
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined
  );

  const handleTabChange = (type: string) => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    params.set("type", logType);
    params.set("page", "1");
    if (apiKey) params.set("apiKey", apiKey);
    if (errorType && logType === "error") params.set("errorType", errorType);
    if (errorCode) params.set("errorCode", errorCode);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    router.push(`?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    params.set("type", logType);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleClearLogs = () => {
    const confirmMessage = dictionary.clearConfirmation.replace(
      "{logType}",
      logType
    );
    if (confirm(confirmMessage)) {
      startTransition(async () => {
        await clearAllLogs(logType);
        alert(`${logType} logs cleared.`);
      });
    }
  };

  const handleLogSelectionChange = (logId: number, isSelected: boolean) => {
    setSelectedLogIds((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(logId);
      } else {
        newSet.delete(logId);
      }
      return newSet;
    });
  };

  const handleSelectAllLogsChange = (allSelected: boolean) => {
    if (allSelected) {
      setSelectedLogIds(new Set(logs.map((log) => log.id)));
    } else {
      setSelectedLogIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    const confirmMessage = dictionary.bulkDeleteConfirmation.replace(
      "{count}",
      selectedLogIds.size.toString()
    );
    if (confirm(confirmMessage)) {
      startTransition(async () => {
        const result = await deleteLogs(Array.from(selectedLogIds), logType);
        if (result.error) {
          alert(`${dictionary.error}: ${result.error}`);
        } else {
          alert(result.success);
          setSelectedLogIds(new Set());
        }
      });
    }
  };

  const totalPages = Math.ceil(total / limit);

  const areAllLogsSelected =
    logs.length > 0 && selectedLogIds.size === logs.length;

  const BulkActionToolbar = () => (
    <div className="mb-4 flex items-center justify-between p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {dictionary.selected.replace("{count}", selectedLogIds.size.toString())}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleBulkDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {dictionary.deleteSelected}
        </Button>
      </div>
    </div>
  );

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

  const FilterBar = () => (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg mb-4">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">
          {dictionary.filters.apiKey}
        </label>
        <Input
          placeholder={dictionary.filters.apiKeyPlaceholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-40"
        />
      </div>
      {logType === "error" && (
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">
            {dictionary.filters.errorType}
          </label>
          <Input
            placeholder={dictionary.filters.errorTypePlaceholder}
            value={errorType}
            onChange={(e) => setErrorType(e.target.value)}
            className="w-40"
          />
        </div>
      )}
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">
          {logType === "request"
            ? dictionary.filters.statusCode
            : dictionary.filters.errorCode}
        </label>
        <Input
          placeholder={dictionary.filters.errorCodePlaceholder}
          value={errorCode}
          onChange={(e) => setErrorCode(e.target.value)}
          className="w-28"
        />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">
          {dictionary.filters.startDate}
        </label>
        <DatePicker date={startDate} setDate={setStartDate} />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">
          {dictionary.filters.endDate}
        </label>
        <DatePicker date={endDate} setDate={setEndDate} />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleApplyFilters}>{dictionary.filters.apply}</Button>
        <Button variant="ghost" onClick={handleClearFilters}>
          {dictionary.filters.clear}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Tabs value={logType} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="request">{dictionary.tabs.request}</TabsTrigger>
            <TabsTrigger value="error">{dictionary.tabs.error}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="destructive"
          onClick={handleClearLogs}
          disabled={isPending}
        >
          {isPending
            ? dictionary.clearing
            : `${dictionary.clearAll} ${logType} ${dictionary.logs}`}
        </Button>
      </div>

      <FilterBar />

      {selectedLogIds.size > 0 && <BulkActionToolbar />}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={areAllLogsSelected}
                  onCheckedChange={(checked) =>
                    handleSelectAllLogsChange(Boolean(checked))
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
                      handleLogSelectionChange(log.id, Boolean(checked))
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
                    onClick={() => setViewingLog(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) handlePageChange(page - 1);
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(p);
                }}
                isActive={page === p}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages) handlePageChange(page + 1);
              }}
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <Dialog
        open={!!viewingLog}
        onOpenChange={(isOpen) => !isOpen && setViewingLog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dictionary.details.title.replace(
                "{id}",
                viewingLog?.id.toString() || ""
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingLog && (
            <div className="space-y-4 text-sm">
              {Object.entries(viewingLog).map(([key, value]) => (
                <div key={key} className="grid grid-cols-4 items-start gap-4">
                  <span className="font-semibold capitalize text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <div className="col-span-3 flex items-start justify-between gap-2">
                    <pre className="whitespace-pre-wrap break-all font-mono bg-muted p-2 rounded-md w-full">
                      {key === "apiKey"
                        ? formatApiKey(String(value))
                        : value instanceof Date
                        ? value.toISOString()
                        : String(value)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigator.clipboard.writeText(String(value))
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
