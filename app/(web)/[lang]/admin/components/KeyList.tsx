// Architectural Decision:
// The KeyList component is a "smart" client component responsible for displaying and managing API keys.
// It encapsulates all client-side logic for filtering, selection, and performing actions on keys.
//
// Implementation Details:
// - Manages local state for key selection (`selectedKeys`) and filtering (`keyFragmentFilter`).
// - Uses React's `useTransition` hook to handle pending states for server actions, providing
//   non-blocking UI updates.
// - Separates keys into "active" and "inactive" groups, displayed within an accordion for
//   better organization and user experience.
// - Implements a `BulkActionToolbar` for performing actions (like deletion) on multiple selected keys.
// - The `resetKeysStatus` functionality has been intentionally removed, as the system now relies
//   on an automatic cooldown mechanism for failing keys, simplifying the manual management process.
// - All server interactions are performed through dedicated Server Actions, ensuring a clean
//   separation between client-side presentation and server-side business logic.

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { GetAllKeysReturnType } from "@/lib/services/key.service";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteApiKeysAction } from "../actions/key.action";
import { KeyTable } from "./KeyTable";

interface KeyListProps {
  keys: GetAllKeysReturnType;
}

export function KeyList({ keys }: KeyListProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.keys.table;
  const [isPending, startTransition] = useTransition();
  const [keyFragmentFilter, setKeyFragmentFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());

  const activeKeys = keys.filter((k) => {
    if (!k.isWorking) return false;
    if (keyFragmentFilter && !k.key.includes(keyFragmentFilter)) {
      return false;
    }
    return true;
  });

  const inactiveKeys = keys.filter((k) => !k.isWorking);

  const handleKeySelectionChange = (key: string, isSelected: boolean) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  };

  const handleSelectAllChange = (
    keysToChange: GetAllKeysReturnType,
    allSelected: boolean
  ) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        keysToChange.forEach((k) => newSet.add(k.key));
      } else {
        keysToChange.forEach((k) => newSet.delete(k.key));
      }
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    const confirmMessage = dict.bulkDeleteConfirmation.replace(
      "{count}",
      selectedKeys.size.toString()
    );

    toast(confirmMessage, {
      action: {
        label: dict.confirm,
        onClick: () => {
          startTransition(async () => {
            const result = await deleteApiKeysAction(Array.from(selectedKeys));
            if (result.error) {
              toast.error(result.error);
            } else {
              toast.success(result.success);
              setSelectedKeys(new Set());
            }
          });
        },
      },
    });
  };

  const BulkActionToolbar = () => (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-muted p-2">
      <span className="text-sm font-medium">
        {dict.selected.replace("{count}", selectedKeys.size.toString())}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleBulkDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {dict.bulkDelete}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {selectedKeys.size > 0 && <BulkActionToolbar />}
      <Accordion
        type="multiple"
        defaultValue={["active-keys", "inactive-keys"]}
        className="w-full"
      >
        <AccordionItem value="active-keys">
          <AccordionTrigger>
            {dict.activeKeys.replace("{count}", activeKeys.length.toString())}
          </AccordionTrigger>
          <AccordionContent>
            <div className="mb-4 flex gap-4">
              <Input
                placeholder={dict.searchPlaceholder}
                value={keyFragmentFilter}
                onChange={(e) => setKeyFragmentFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <KeyTable
              keys={activeKeys}
              selectedKeys={selectedKeys}
              onKeySelectionChange={handleKeySelectionChange}
              onSelectAllChange={(checked) =>
                handleSelectAllChange(activeKeys, checked)
              }
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="inactive-keys">
          <AccordionTrigger>
            {dict.inactiveKeys.replace(
              "{count}",
              inactiveKeys.length.toString()
            )}
          </AccordionTrigger>
          <AccordionContent>
            <KeyTable
              keys={inactiveKeys}
              selectedKeys={selectedKeys}
              onKeySelectionChange={handleKeySelectionChange}
              onSelectAllChange={(checked) =>
                handleSelectAllChange(inactiveKeys, checked)
              }
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
