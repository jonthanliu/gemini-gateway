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
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { Log } from "@/lib/services/log.service";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearAllLogsAction, deleteLogsAction } from "../actions/log.action";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { FilterBar } from "./FilterBar";
import { LogDetailsDialog } from "./LogDetailsDialog";
import { LogTable } from "./LogTable";

interface LogViewerProps {
  initialLogs: Log[];
  initialTotal: number;
}

export function LogViewer({ initialLogs, initialTotal }: LogViewerProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.logs;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [viewingLog, setViewingLog] = useState<Log | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState(new Set<number>());

  const logType = searchParams.get("type") === "error" ? "error" : "request";
  const page = Number(searchParams.get("page")) || 1;
  const limit = 15;

  const handleTabChange = (type: string) => {
    const params = new URLSearchParams(searchParams);
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
    const confirmMessage = dict.clearConfirmation.replace("{logType}", logType);
    toast(confirmMessage, {
      action: {
        label: dict.confirm,
        onClick: () => {
          startTransition(async () => {
            const result = await clearAllLogsAction(logType);
            if (result.error) toast.error(result.error);
            else toast.success(result.success);
          });
        },
      },
    });
  };

  const handleLogSelectionChange = (logId: number, isSelected: boolean) => {
    setSelectedLogIds((prev) => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(logId);
      else newSet.delete(logId);
      return newSet;
    });
  };

  const handleSelectAllLogsChange = (allSelected: boolean) => {
    if (allSelected) {
      setSelectedLogIds(new Set(initialLogs.map((log) => log.id)));
    } else {
      setSelectedLogIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    const confirmMessage = dict.bulkDeleteConfirmation.replace(
      "{count}",
      selectedLogIds.size.toString()
    );
    toast(confirmMessage, {
      action: {
        label: dict.confirm,
        onClick: () => {
          startTransition(async () => {
            const result = await deleteLogsAction(
              Array.from(selectedLogIds),
              logType
            );
            if (result.error) {
              toast.error(result.error);
            } else {
              toast.success(result.success);
              setSelectedLogIds(new Set());
            }
          });
        },
      },
    });
  };

  const totalPages = Math.ceil(initialTotal / limit);

  const getPaginationItems = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const left = currentPage - delta;
    const right = currentPage + delta;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left - 1 && i <= right + 1)) {
        range.push(i);
      }
    }
    for (const i of range) {
      if (l) {
        if (i - l > 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Tabs value={logType} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="request">{dict.tabs.request}</TabsTrigger>
            <TabsTrigger value="error">{dict.tabs.error}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="destructive"
          onClick={handleClearLogs}
          disabled={isPending}
        >
          {isPending
            ? dict.clearing
            : `${dict.clearAll} ${logType} ${dict.logs}`}
        </Button>
      </div>

      <FilterBar />

      {selectedLogIds.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedLogIds.size}
          onBulkDelete={handleBulkDelete}
          isPending={isPending}
        />
      )}

      <LogTable
        logs={initialLogs}
        logType={logType}
        selectedLogIds={selectedLogIds}
        onLogSelectionChange={handleLogSelectionChange}
        onSelectAllLogsChange={handleSelectAllLogsChange}
        onViewLog={setViewingLog}
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
          {paginationItems.map((p, index) => (
            <PaginationItem key={index}>
              {typeof p === "string" ? (
                <span className="px-4 py-2">{p}</span>
              ) : (
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
              )}
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

      <LogDetailsDialog viewingLog={viewingLog} setViewingLog={setViewingLog} />
    </div>
  );
}
