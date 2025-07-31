"use client";

import { createContext, ReactNode, useContext } from "react";
import { Dictionary } from "./dictionaries";

// 1. Create the context with a default value (null or a default dictionary)
const DictionaryContext = createContext<Dictionary | null>(null);

// 2. Create the Provider component
interface DictionaryProviderProps {
  dictionary: Dictionary;
  children: ReactNode;
}

export function DictionaryProvider({
  dictionary,
  children,
}: DictionaryProviderProps) {
  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

// 3. Create the custom hook for easy consumption
export function useDictionary() {
  const dictionary = useContext(DictionaryContext);
  if (dictionary === null) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return dictionary;
}
