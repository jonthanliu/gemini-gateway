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
import { getAllKeys } from "@/lib/services/key.service";
import { formatApiKey } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteApiKeys, resetKeysFailures, verifyApiKeys } from "./actions";
import { KeyUsageDetail } from "./KeyUsageDetail";

export type Key = Awaited<ReturnType<typeof getAllKeys>>[number];

interface KeyTableProps {
  keys: Key[];
  selectedKeys: Set<string>;
  onKeySelectionChange: (key: string, isSelected: boolean) => void;
  onSelectAllChange: (allSelected: boolean) => void;
  dictionary: Dictionary["keys"]["table"];
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
    if (confirm(confirmMessage)) {
      startTransition(async () => {
        const result = await deleteApiKeys([key]);
        if (result.error) alert(`${dictionary.error}: ${result.error}`);
        else alert(result.success);
      });
    }
  };

  const handleReset = (key: string) => {
    startTransition(async () => {
      const result = await resetKeysFailures([key]);
      if (result.error) alert(`${dictionary.error}: ${result.error}`);
      else alert(result.success);
    });
  };

  const handleVerify = (key: string) => {
    startTransition(async () => {
      const result = await verifyApiKeys([key]);
      if (result.error) {
        alert(`${dictionary.error}: ${result.error}`);
      } else {
        const keyResult = result.results?.[0];
        if (keyResult) {
          const status = keyResult.success
            ? dictionary.active
            : dictionary.inactive;
          const message = dictionary.success.verificationResult
            .replace("{key}", formatApiKey(keyResult.key))
            .replace("{status}", status);
          alert(message);
        } else if (result.success) {
          alert(result.success);
        }
      }
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
            <TableHead>{dictionary.totalCalls}</TableHead>
            <TableHead>{dictionary.last1m}</TableHead>
            <TableHead>{dictionary.last1h}</TableHead>
            <TableHead>{dictionary.last24h}</TableHead>
            <TableHead>{dictionary.lastFailedAt}</TableHead>
            <TableHead className="text-right">{dictionary.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow
              key={key.key}
              data-state={selectedKeys.has(key.key) && "selected"}
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
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    key.isWorking
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {key.isWorking ? dictionary.active : dictionary.inactive}
                </span>
              </TableCell>
              <TableCell>{key.failCount}</TableCell>
              <TableCell>{key.totalRequests}</TableCell>
              <TableCell>...</TableCell>
              <TableCell>...</TableCell>
              <TableCell>...</TableCell>
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
                      onClick={() => handleVerify(key.key)}
                      disabled={isPending}
                    >
                      {dictionary.verify}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleReset(key.key)}
                      disabled={isPending}
                    >
                      {dictionary.resetFailures}
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
