"use client";

import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addApiKeysAction, type KeyFormState } from "../actions/key.action";

export function KeyForm() {
  const dictionary = useDictionary();
  const dict = dictionary.admin.keyForm;

  const [state, formAction] = useActionState<KeyFormState, FormData>(
    addApiKeysAction,
    {
      success: false,
      message: "",
    }
  );
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="keys"
          className="block text-sm font-medium text-gray-700"
        >
          {dict.label}
        </label>
        <textarea
          id="keys"
          name="keys"
          rows={5}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder={dict.placeholder}
        />
      </div>
      {!state.success && state.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
        >
          {pending ? dict.saving : dict.saveButton}
        </button>
      </div>
    </form>
  );
}
