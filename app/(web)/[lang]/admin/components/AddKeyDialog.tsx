"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dictionary } from "@/lib/i18n/dictionaries";
import { KeyForm } from "./KeyForm";

interface AddKeyDialogProps {
  dictionary: Dictionary["admin"]["addKeyDialog"];
}

export function AddKeyDialog({ dictionary }: AddKeyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{dictionary.addButton}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dictionary.title}</DialogTitle>
          <DialogDescription>{dictionary.description}</DialogDescription>
        </DialogHeader>
        <KeyForm dictionary={dictionary.keyForm} />
      </DialogContent>
    </Dialog>
  );
}
