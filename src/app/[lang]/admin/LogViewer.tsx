"use client";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearAllLogs, deleteLogs } from "./actions";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { FilterBar } from "./FilterBar";
import { LogDetailsDialog } from "./LogDetailsDialog";
import { LogTable } from "./LogTable";

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

  const handleClearLogs = () => {
    const confirmMessage = dictionary.clearConfirmation.replace(
      "{logType}",
      logType
    );
    toast(confirmMessage, {
      action: {
        label: dictionary.confirm,
        onClick: () => {
          startTransition(async () => {
            await clearAllLogs(logType);
            toast.success(`${logType} logs cleared.`);
          });
        },
      },
    });
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
    toast(confirmMessage, {
      action: {
        label: dictionary.confirm,
        onClick: () => {
          startTransition(async () => {
            const result = await deleteLogs(
              Array.from(selectedLogIds),
              logType
            );
            if (result.error) {
              toast.error(`${dictionary.error}: ${result.error}`);
            } else {
              toast.success(result.success);
              setSelectedLogIds(new Set());
            }
          });
        },
      },
    });
  };

  const totalPages = Math.ceil(total / limit);

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

      <FilterBar logType={logType} dictionary={dictionary.filters} />

      {selectedLogIds.size > 0 && (
        <BulkActionToolbar
          selectedLogIds={selectedLogIds}
          onBulkDelete={handleBulkDelete}
          isPending={isPending}
          dictionary={dictionary}
        />
      )}

      <LogTable
        logs={logs}
        logType={logType}
        selectedLogIds={selectedLogIds}
        onLogSelectionChange={handleLogSelectionChange}
        onSelectAllLogsChange={handleSelectAllLogsChange}
        onViewLog={setViewingLog}
        dictionary={dictionary}
      />

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

      <LogDetailsDialog
        viewingLog={viewingLog}
        setViewingLog={setViewingLog}
        dictionary={dictionary.details}
      />
    </div>
  );
}
