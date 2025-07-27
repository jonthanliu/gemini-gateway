"use client";

import { Dictionary } from "@/lib/i18n/dictionaries";
import { Lightbulb } from "lucide-react";
import { AddKeyDialog } from "./AddKeyDialog";

export function Onboarding({ dictionary }: { dictionary: Dictionary["keys"] }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Lightbulb className="h-6 w-6 text-gray-500" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{dictionary.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {dictionary.description}
      </p>
      <div className="mt-6">
        <AddKeyDialog dictionary={dictionary.addDialog} />
      </div>
    </div>
  );
}
