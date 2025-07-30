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

interface MappingsTableProps {
  data: ModelMapping[];
}

export function MappingsTable({ data }: MappingsTableProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.mappings.table;
  const commonDict = dictionary.common;

  return (
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
                    <DropdownMenuItem>{commonDict.edit}</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
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
  );
}
