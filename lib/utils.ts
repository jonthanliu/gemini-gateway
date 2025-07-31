import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatApiKey(key: string) {
  if (typeof key !== "string" || key.length <= 8) {
    return key;
  }
  return `${key.substring(0, 4)}....${key.substring(key.length - 4)}`;
}
