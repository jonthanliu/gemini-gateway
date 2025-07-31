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
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { KeyForm } from "./KeyForm";

export function AddKeyDialog() {
  const dictionary = useDictionary();
  const dict = dictionary.admin.addKeyDialog;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{dict.addButton}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dict.title}</DialogTitle>
          <DialogDescription>{dict.description}</DialogDescription>
        </DialogHeader>
        <KeyForm />
      </DialogContent>
    </Dialog>
  );
}
