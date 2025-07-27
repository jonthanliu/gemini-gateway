// This component will guide users through the initial setup process,
// specifically for adding their first API key when none are present.
// It will be a client component ("use client") to provide interactivity.

"use client";

export function Onboarding() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold">Welcome!</h2>
      <p>Onboarding placeholder: Add your first API key to get started.</p>
    </div>
  );
}
