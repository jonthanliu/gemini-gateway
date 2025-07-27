"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "../actions/auth";

// The SubmitButton is a sub-component that uses the `useFormStatus` hook.
// This hook provides the pending status of the form submission, allowing us
// to disable the button and show a loading state automatically, improving UX.
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
    >
      {pending ? "Signing In..." : "Sign In"}
    </button>
  );
}

export function LoginForm() {
  // `useActionState` is a React hook that manages the state transitions for a form action.
  // It takes the server action (`login`) and an initial state as arguments.
  // It returns the current state and a wrapped action to be used in the form.
  const [state, formAction] = useActionState(login, { error: undefined });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Admin Access</h1>
        <form action={formAction} className="space-y-6">
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700"
            >
              Auth Token
            </label>
            <input
              id="token"
              name="token"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <div>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
