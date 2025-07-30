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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { ModelMapping } from "@/lib/services/model-mapping.service";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createMappingAction, updateMappingAction } from "../actions";

interface MappingFormDialogProps {
  mapping?: ModelMapping;
  children: React.ReactNode;
}

export function MappingFormDialog({
  mapping,
  children,
}: MappingFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dictionary = useDictionary();
  const dict = dictionary.admin.mappings.form;
  const tableDict = dictionary.admin.mappings.table;
  const commonDict = dictionary.common;

  const isEditMode = !!mapping;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      source_name: formData.get("source_name") as string,
      source_protocol: formData.get(
        "source_protocol"
      ) as ModelMapping["source_protocol"],
      priority: Number(formData.get("priority") || 0),
      target_name: formData.get("target_name") as string,
      target_method: formData.get(
        "target_method"
      ) as ModelMapping["target_method"],
      target_provider: "gemini" as const,
      capabilities: null,
      constraints: null,
    };

    startTransition(async () => {
      const result = isEditMode
        ? await updateMappingAction(mapping.id, data)
        : await createMappingAction(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? dict.editTitle : dict.addTitle}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? dict.editDescription : dict.addDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source_name" className="text-right">
                {tableDict.sourceModel}
              </Label>
              <Input
                id="source_name"
                name="source_name"
                defaultValue={mapping?.source_name}
                className="col-span-3"
                required
                disabled={mapping?.source_name === "__DEFAULT__"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source_protocol" className="text-right">
                {tableDict.protocol}
              </Label>
              <Select
                name="source_protocol"
                defaultValue={mapping?.source_protocol}
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={dict.selectProtocol} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">openai</SelectItem>
                  <SelectItem value="anthropic">anthropic</SelectItem>
                  <SelectItem value="gemini">gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                {tableDict.priority}
              </Label>
              <Input
                id="priority"
                name="priority"
                type="number"
                defaultValue={mapping?.priority}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target_name" className="text-right">
                {tableDict.targetModel}
              </Label>
              <Input
                id="target_name"
                name="target_name"
                defaultValue={mapping?.target_name}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target_method" className="text-right">
                {tableDict.targetMethod}
              </Label>
              <Select
                name="target_method"
                defaultValue={mapping?.target_method}
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={dict.selectMethod} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generateContent">
                    {dict.methodGenerateContent}
                  </SelectItem>
                  <SelectItem value="streamGenerateContent">
                    {dict.methodStreamGenerateContent}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditMode
                  ? dict.saving
                  : dict.creating
                : commonDict.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
