
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { Log } from "@/lib/services/log.service";
import { formatApiKey } from "@/lib/utils";
import { Copy } from "lucide-react";

interface LogDetailsDialogProps {
  viewingLog: Log | null;
  setViewingLog: (log: Log | null) => void;
  dictionary: Dictionary["admin"]["logs"]["details"];
}

export function LogDetailsDialog({
  viewingLog,
  setViewingLog,
  dictionary,
}: LogDetailsDialogProps) {
  return (
    <Dialog
      open={!!viewingLog}
      onOpenChange={(isOpen) => !isOpen && setViewingLog(null)}
    >
      <DialogContent className="w-full max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {dictionary.title.replace(
              "{id}",
              viewingLog?.id.toString() || ""
            )}
          </DialogTitle>
        </DialogHeader>
        {viewingLog && (
          <div className="flex-1 space-y-4 overflow-y-auto pr-4 text-sm">
            {Object.entries(viewingLog).map(([key, value]) => (
              <div key={key} className="grid grid-cols-4 items-start gap-4">
                <span className="capitalize font-semibold text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <div className="col-span-3 flex items-start justify-between gap-2">
                  <pre className="whitespace-pre-wrap break-all font-mono w-full rounded-md bg-muted p-2">
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
  );
}
