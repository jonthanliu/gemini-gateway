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
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { Wand2, X } from "lucide-react";
import { useState } from "react";

interface DynamicListInputProps {
  value: string[]; // Changed to string array for better type safety
  onChange: (newValue: string[]) => void;
}

export function DynamicListInput({
  value: items = [], // Default to empty array if value is not provided
  onChange,
}: DynamicListInputProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.config.form.dynamicList;
  const [newItem, setNewItem] = useState("");
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const handleAddItem = () => {
    if (newItem && !items.includes(newItem)) {
      onChange([...items, newItem]);
      setNewItem("");
    }
  };

  const handleGenerateAndAddItem = () => {
    const generatedItem = crypto.randomUUID();
    onChange([...items, generatedItem]);
  };

  const handleDeleteItem = (itemToDelete: string) => {
    onChange(items.filter((item) => item !== itemToDelete));
  };

  const handleBulkAdd = () => {
    const newItems = bulkText
      .split(/[\\n,s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const combined = [...new Set([...items, ...newItems])];
    onChange(combined);
    setBulkText("");
    setIsBulkAddOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={dict.placeholder}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), handleAddItem())
          }
        />
        <Button onClick={handleAddItem} type="button">
          {dict.add}
        </Button>
        <Button
          onClick={handleGenerateAndAddItem}
          type="button"
          variant="outline"
          size="icon"
          title={dict.generateTitle}
        >
          <Wand2 className="h-4 w-4" />
          <span className="sr-only">{dict.generateAria}</span>
        </Button>
        <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" type="button">
              {dict.bulkAdd}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dict.bulkAddTitle}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={dict.bulkPlaceholder}
              rows={10}
            />
            <DialogFooter>
              <Button onClick={handleBulkAdd} type="button">
                {dict.bulkBtn}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex min-h-20 flex-wrap gap-2 rounded-md border p-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
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
          <p className="p-2 text-sm text-muted-foreground">{dict.noItems}</p>
        )}
      </div>
    </div>
  );
}
