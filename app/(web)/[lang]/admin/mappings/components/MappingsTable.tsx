"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { ModelMapping } from "@/lib/services/model-mapping.service";
import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMappingAction } from "../actions";
import { EditMappingDialog } from "./EditMappingDialog";

interface MappingsTableProps {
  data: ModelMapping[];
}

export function MappingsTable({ data }: MappingsTableProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.mappings.table;
  const commonDict = dictionary.common;
  const [isPending, startTransition] = useTransition();
  const [editingMapping, setEditingMapping] = useState<ModelMapping | null>(
    null
  );

  const handleDelete = (mapping: ModelMapping) => {
    toast(
      `Are you sure you want to delete the mapping for "${mapping.source_name}"?`,
      {
        action: {
          label: "Confirm",
          onClick: () => {
            startTransition(async () => {
              const result = await deleteMappingAction(mapping.id);
              if (result.error) {
                toast.error(result.error);
              } else {
                toast.success(result.success);
              }
            });
          },
        },
      }
    );
  };

  return (
    <>
      {editingMapping && (
        <EditMappingDialog
          mapping={editingMapping}
          isOpen={!!editingMapping}
          onOpenChange={(isOpen) => !isOpen && setEditingMapping(null)}
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.sourceModel}</TableHead>
              <TableHead>{dict.protocol}</TableHead>
              <TableHead>{dict.priority}</TableHead>
              <TableHead>{dict.targetModel}</TableHead>
              <TableHead className="text-right">{dict.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell className="font-medium">
                  {mapping.source_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{mapping.source_protocol}</Badge>
                </TableCell>
                <TableCell>{mapping.priority}</TableCell>
                <TableCell>{mapping.target_name}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{dict.openMenuAria}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingMapping(mapping)}
                      >
                        {commonDict.edit}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(mapping)}
                        disabled={isPending}
                      >
                        {commonDict.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
