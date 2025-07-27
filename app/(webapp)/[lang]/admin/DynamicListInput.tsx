"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { Wand2, X } from "lucide-react";
import { useState } from "react";

interface DynamicListInputProps {
  value: string; // Comma or newline separated
  onChange: (newValue: string) => void;
  dictionary: Dictionary["config"]["form"]["dynamicList"];
}

export function DynamicListInput({
  value,
  onChange,
  dictionary,
}: DynamicListInputProps) {
  const items = value ? value.split(/[\n,]+/).filter(Boolean) : [];
  const [newItem, setNewItem] = useState("");
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const handleAddItem = () => {
    if (newItem && !items.includes(newItem)) {
      onChange([...items, newItem].join("\n"));
      setNewItem("");
    }
  };

  const handleGenerateAndAddItem = () => {
    const generatedItem = crypto.randomUUID();
    onChange([...items, generatedItem].join("\n"));
  };

  const handleDeleteItem = (itemToDelete: string) => {
    onChange(items.filter((item) => item !== itemToDelete).join("\n"));
  };

  const handleBulkAdd = () => {
    const newItems = bulkText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const combined = [...new Set([...items, ...newItems])];
    onChange(combined.join("\n"));
    setBulkText("");
    setIsBulkAddOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={dictionary.placeholder}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), handleAddItem())
          }
        />
        <Button onClick={handleAddItem} type="button">
          {dictionary.add}
        </Button>
        <Button
          onClick={handleGenerateAndAddItem}
          type="button"
          variant="outline"
          size="icon"
          title={dictionary.generateTitle}
        >
          <Wand2 className="h-4 w-4" />
          <span className="sr-only">{dictionary.generateAria}</span>
        </Button>
        <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" type="button">
              {dictionary.bulkAdd}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dictionary.bulkAddTitle}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={dictionary.bulkPlaceholder}
              rows={10}
            />
            <DialogFooter>
              <Button onClick={handleBulkAdd} type="button">
                {dictionary.bulkBtn}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-20">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
          >
            <span>{item}</span>
            <button
              onClick={() => handleDeleteItem(item)}
              className="rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">
            {dictionary.noItems}
          </p>
        )}
      </div>
    </div>
  );
}
