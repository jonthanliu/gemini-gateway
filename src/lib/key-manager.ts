import logger from "./logger";

// --- Singleton Instance Reset Function ---

// This function is kept for backward compatibility with existing imports
// but no longer has any effect since we've moved to a stateless architecture
export function resetKeyManager() {
  logger.info("KeyManager instance reset requested (no-op in stateless mode).");
}

// This function is kept for backward compatibility with existing imports
// but no longer has any effect since we've moved to a stateless architecture
export async function getKeyManager(): Promise<null> {
  logger.info("getKeyManager called (no-op in stateless mode).");
  return null;
}