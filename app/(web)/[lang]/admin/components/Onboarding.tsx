"use client";

import { KeyForm } from "./KeyForm";
import { Dictionary } from "@/lib/i18n/dictionaries";

interface OnboardingProps {
  dictionary: Dictionary["admin"];
}

export function Onboarding({ dictionary }: OnboardingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{dictionary.onboarding.title}</h1>
          <p className="mt-2 text-gray-600">
            {dictionary.onboarding.description}
          </p>
        </div>
        <KeyForm dictionary={dictionary.keyForm} />
      </div>
    </div>
  );
}
