"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { ClipboardCheck, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteApiKeys, resetKeysFailures, verifyApiKeys } from "./actions";
import { Key, KeyTable } from "./KeyTable";

interface KeyListProps {
  keys: Key[];
  dictionary: Dictionary["keys"]["table"];
}

type ActionResult = {
  success?: string;
  error?: string;
  results?: { key: string; success: boolean }[];
};

export function KeyList({ keys, dictionary }: KeyListProps) {
  const [isPending, startTransition] = useTransition();
  const [failCountFilter, setFailCountFilter] = useState("");
  const [keyFragmentFilter, setKeyFragmentFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());

  const workingKeys = keys.filter((k) => {
    if (!k.isWorking) return false;
    if (failCountFilter && k.failCount < parseInt(failCountFilter, 10)) {
      return false;
    }
    if (keyFragmentFilter && !k.key.includes(keyFragmentFilter)) {
      return false;
    }
    return true;
  });

  const notWorkingKeys = keys.filter((k) => !k.isWorking);

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

  const handleSelectAllChange = (keysToChange: Key[], allSelected: boolean) => {
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

  const handleBulkAction = (
    action: (keys: string[]) => Promise<ActionResult>,
    confirmMessage?: string
  ) => {
    if (confirmMessage && !confirm(confirmMessage)) return;

    startTransition(async () => {
      const result = await action(Array.from(selectedKeys));
      if (result.error) {
        alert(`${dictionary.error}: ${result.error}`);
      } else {
        alert(result.success || "Action completed.");
        setSelectedKeys(new Set()); // Clear selection after action
      }
    });
  };

  const BulkActionToolbar = () => (
    <div className="mb-4 flex items-center justify-between p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {dictionary.selected.replace("{count}", selectedKeys.size.toString())}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkAction(verifyApiKeys)}
          disabled={isPending}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          {dictionary.bulkVerify}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkAction(resetKeysFailures)}
          disabled={isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {dictionary.bulkReset}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() =>
            handleBulkAction(
              deleteApiKeys,
              dictionary.bulkDeleteConfirmation.replace(
                "{count}",
                selectedKeys.size.toString()
              )
            )
          }
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {dictionary.bulkDelete}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {selectedKeys.size > 0 && <BulkActionToolbar />}
      <Accordion
        type="multiple"
        defaultValue={["working-keys", "not-working-keys"]}
        className="w-full"
      >
        <AccordionItem value="working-keys">
          <AccordionTrigger>
            {dictionary.activeKeys.replace(
              "{count}",
              workingKeys.length.toString()
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder={dictionary.searchPlaceholder}
                value={keyFragmentFilter}
                onChange={(e) => setKeyFragmentFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                type="number"
                placeholder={dictionary.minFailCountPlaceholder}
                value={failCountFilter}
                onChange={(e) => setFailCountFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <KeyTable
              keys={workingKeys}
              selectedKeys={selectedKeys}
              onKeySelectionChange={handleKeySelectionChange}
              onSelectAllChange={(checked) =>
                handleSelectAllChange(workingKeys, checked)
              }
              dictionary={dictionary}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="not-working-keys">
          <AccordionTrigger>
            {dictionary.inactiveKeys.replace(
              "{count}",
              notWorkingKeys.length.toString()
            )}
          </AccordionTrigger>
          <AccordionContent>
            <KeyTable
              keys={notWorkingKeys}
              selectedKeys={selectedKeys}
              onKeySelectionChange={handleKeySelectionChange}
              onSelectAllChange={(checked) =>
                handleSelectAllChange(notWorkingKeys, checked)
              }
              dictionary={dictionary}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
