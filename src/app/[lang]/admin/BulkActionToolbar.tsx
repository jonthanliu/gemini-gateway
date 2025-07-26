"use client";

import { Button } from "@/components/ui/button";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { Trash2 } from "lucide-react";

interface BulkActionToolbarProps {
  selectedLogIds: Set<number>;
  onBulkDelete: () => void;
  isPending: boolean;
  dictionary: Dictionary["logs"];
}

export function BulkActionToolbar({
  selectedLogIds,
  onBulkDelete,
  isPending,
  dictionary,
}: BulkActionToolbarProps) {
  return (
    <div className="mb-4 flex items-center justify-between p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {dictionary.selected.replace("{count}", selectedLogIds.size.toString())}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={onBulkDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {dictionary.deleteSelected}
        </Button>
      </div>
    </div>
  );
}
