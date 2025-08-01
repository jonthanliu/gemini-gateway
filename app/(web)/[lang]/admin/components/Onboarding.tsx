"use client";

import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { KeyForm } from "./KeyForm";

export function Onboarding() {
  const dictionary = useDictionary();
  const dict = dictionary.admin;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-lg p-8 space-y-6 bg-background rounded-lg shadow-md border">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {dict.onboarding.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {dict.onboarding.description}
          </p>
        </div>
        <KeyForm />
      </div>
    </div>
  );
}
