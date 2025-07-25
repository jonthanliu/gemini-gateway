"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addApiKeys } from "./actions";

export function AddKeyDialog({
  dictionary,
}: {
  dictionary: Dictionary["keys"];
}) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async () => {
    startTransition(async () => {
      const result = await addApiKeys(keys);
      if (result?.error) {
        toast.error(dictionary.addDialog.toast.error, {
          description: result.error,
        });
      } else {
        toast.success(dictionary.addDialog.toast.success, {
          description: result.success,
        });
        setOpen(false);
        setKeys("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{dictionary.addKey}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dictionary.addDialog.dialogTitle}</DialogTitle>
          <DialogDescription>
            {dictionary.addDialog.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 items-center">
          <Label htmlFor="keys" className="text-right">
            {dictionary.addDialog.label}
          </Label>
          <Textarea
            id="keys"
            value={keys}
            onChange={(e) => setKeys(e.target.value)}
            className="col-span-3"
            placeholder={dictionary.addDialog.placeholder}
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? dictionary.addDialog.adding
              : dictionary.addDialog.addBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
