-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME,
    "lastChecked" DATETIME,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_ApiKey" ("createdAt", "id", "key") SELECT "createdAt", "id", "key" FROM "ApiKey";
DROP TABLE "ApiKey";
ALTER TABLE "new_ApiKey" RENAME TO "ApiKey";
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
