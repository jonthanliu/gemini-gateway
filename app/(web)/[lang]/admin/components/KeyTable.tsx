
// Architectural Decision:
// The KeyTable component is a "pure" client component focused on rendering the list of API keys.
// Its primary role is to display the data provided by its parent and delegate user actions.
//
// Implementation Details:
// - It is a "use client" component because it manages interactive elements like checkboxes,
//   dropdown menus, and dialog triggers.
// - It receives all necessary data and event handlers (`keys`, `selectedKeys`, `onKeySelectionChange`,
//   `onSelectAllChange`, `dictionary`) as props. This makes it a stateless, presentational
//   component that is easy to test and reuse.
// - The "reset failures" action has been removed, aligning with the system's shift to an
//   automatic key cooldown mechanism.
// - Per-key, time-bucketed statistics (last 1m/1h/24h) have been removed from the display to
//   simplify the UI, as this level of detail was deemed unnecessary for the primary dashboard view.
// - It uses a `Dialog` to display the `KeyUsageDetail` component, lazy-loading the detailed
//   view only when a user requests it.

"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { GetAllKeysReturnType } from "@/lib/services/key.service";
import { formatApiKey } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteApiKeysAction } from "../actions/key.action";
import { KeyUsageDetail } from "./KeyUsageDetail";

interface KeyTableProps {
  keys: GetAllKeysReturnType;
  selectedKeys: Set<string>;
  onKeySelectionChange: (key: string, isSelected: boolean) => void;
  onSelectAllChange: (allSelected: boolean) => void;
  dictionary: Dictionary["admin"]["keys"]["table"];
}

export function KeyTable({
  keys,
  selectedKeys,
  onKeySelectionChange,
  onSelectAllChange,
  dictionary,
}: KeyTableProps) {
  const [isPending, startTransition] = useTransition();
  const [viewingKey, setViewingKey] = useState<string | null>(null);

  const handleDelete = (key: string) => {
    const confirmMessage = dictionary.deleteConfirmation.replace(
      "{key}",
      formatApiKey(key)
    );
    toast(confirmMessage, {
      action: {
        label: dictionary.confirm,
        onClick: () => {
          startTransition(async () => {
            const result = await deleteApiKeysAction([key]);
            if (result.error) toast.error(result.error);
            else toast.success(result.success);
          });
        },
      },
    });
  };

  const areAllSelected =
    keys.length > 0 && keys.every((k) => selectedKeys.has(k.key));

  return (
    <>
      <Dialog
        open={!!viewingKey}
        onOpenChange={(isOpen) => !isOpen && setViewingKey(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dictionary.usageDetailsTitle.replace(
                "{key}",
                formatApiKey(viewingKey || "")
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingKey && (
            <KeyUsageDetail apiKey={viewingKey} dictionary={dictionary.usage} />
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={areAllSelected}
                onCheckedChange={(checked) =>
                  onSelectAllChange(Boolean(checked))
                }
                aria-label={dictionary.selectAllAria}
              />
            </TableHead>
            <TableHead>{dictionary.key}</TableHead>
            <TableHead>{dictionary.status}</TableHead>
            <TableHead>{dictionary.failCount}</TableHead>
            <TableHead>{dictionary.disabledUntil}</TableHead>
            <TableHead>{dictionary.totalCalls}</TableHead>
            <TableHead>{dictionary.lastFailedAt}</TableHead>
            <TableHead className="text-right">{dictionary.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow
              key={key.key}
              data-state={selectedKeys.has(key.key) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedKeys.has(key.key)}
                  onCheckedChange={(checked) =>
                    onKeySelectionChange(key.key, Boolean(checked))
                  }
                  aria-label={dictionary.selectRowAria.replace(
                    "{key}",
                    formatApiKey(key.key)
                  )}
                />
              </TableCell>
              <TableCell>{formatApiKey(key.key)}</TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    key.isWorking
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
                >
                  {key.isWorking ? dictionary.active : dictionary.inactive}
                </span>
              </TableCell>
              <TableCell>{key.failedRequests}</TableCell>
              <TableCell>{key.disabledUntil ? new Date(key.disabledUntil).toLocaleString() : dictionary.notApplicable}</TableCell>
              <TableCell>{key.totalRequests}</TableCell>
              <TableCell>
                {key.lastFailedAt
                  ? new Date(key.lastFailedAt).toLocaleString()
                  : dictionary.notApplicable}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">{dictionary.openMenuAria}</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewingKey(key.key)}>
                      {dictionary.viewDetails}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-500"
                      onClick={() => handleDelete(key.key)}
                      disabled={isPending}
                    >
                      {dictionary.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
