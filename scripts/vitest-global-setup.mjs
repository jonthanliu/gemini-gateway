import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, "../db");

async function cleanupTestDbs() {
  try {
    const files = await fs.readdir(dbDir);
    const dbFiles = files.filter((file) => file.endsWith(".db"));

    if (dbFiles.length === 0) {
      console.log("No temporary test databases to clean up.");
      return;
    }

    console.log(
      `Found ${dbFiles.length} temporary test databases to clean up...`
    );

    for (const file of dbFiles) {
      const filePath = path.join(dbDir, file);
      await fs.unlink(filePath);
      console.log(`Deleted: ${filePath}`);
    }

    console.log("Cleanup of temporary test databases complete.");
  } catch (error) {
    console.error("Error during test database cleanup:", error);
    // Exit with a non-zero code to indicate failure, which can be useful in CI environments.
    process.exit(1);
  }
}

export async function teardown() {
  await cleanupTestDbs();
}
