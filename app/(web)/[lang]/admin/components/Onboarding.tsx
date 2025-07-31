"use client";

import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { KeyForm } from "./KeyForm";

export function Onboarding() {
  const dictionary = useDictionary();
  const dict = dictionary.admin;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{dict.onboarding.title}</h1>
          <p className="mt-2 text-gray-600">{dict.onboarding.description}</p>
        </div>
        <KeyForm />
      </div>
    </div>
  );
}
