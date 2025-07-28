"use client";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { Trash2 } from "lucide-react";

interface BulkActionToolbarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  isPending: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onBulkDelete,
  isPending,
}: BulkActionToolbarProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.logs;

  return (
    <div className="mb-4 flex items-center justify-between p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {dict.selected.replace("{count}", selectedCount.toString())}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={onBulkDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {dict.deleteSelected}
        </Button>
      </div>
    </div>
  );
}
