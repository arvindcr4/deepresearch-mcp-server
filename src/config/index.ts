import dotenv from "dotenv";
import { readFileSync, mkdirSync, existsSync, statSync } from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
dotenv.config();

// --- Determine Project Root ---
/**
 * Finds the project root directory by searching upwards for package.json.
 * @param startDir The directory to start searching from.
 * @returns The absolute path to the project root, or throws an error if not found.
 */
const findProjectRoot = (startDir: string): string => {
    let currentDir = startDir;
    while (true) {
        const packageJsonPath = join(currentDir, 'package.json');
        if (existsSync(packageJsonPath)) {
            console.log(`Project root found at: ${currentDir}`); // Log successful discovery
            return currentDir;
        }
        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached the filesystem root without finding package.json
            throw new Error(`Could not find project root (package.json) starting from ${startDir}`);
        }
        currentDir = parentDir;
    }
};

let projectRoot: string;
try {
    const currentModuleDir = dirname(fileURLToPath(import.meta.url));
    projectRoot = findProjectRoot(currentModuleDir);
} catch (error: any) {
    console.error(`FATAL: Error determining project root: ${error.message}`);
    // Fallback or exit if root cannot be determined
    projectRoot = process.cwd(); // Fallback to cwd as a last resort, though likely problematic
    console.warn(`Warning: Using process.cwd() (${projectRoot}) as fallback project root.`);
    // Consider exiting: process.exit(1);
}
// --- End Determine Project Root ---


// --- Reading package.json ---
// Resolve package.json path relative to project root for safety
const packageJsonPath = path.resolve(projectRoot, 'package.json');
let pkg: { name: string; version: string };
try {
  // Security Check: Ensure we are reading from within the project root
  if (!packageJsonPath.startsWith(projectRoot + path.sep)) {
    throw new Error(`package.json path resolves outside project root: ${packageJsonPath}`);
  }
  pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
} catch (error: any) {
  console.error(`FATAL: Could not read or parse package.json at ${packageJsonPath}. Error: ${error.message}`);
  // Assign default values or re-throw, depending on how critical this is.
  // For now, let's assign defaults and log the error.
  pkg = { name: 'atlas-mcp-server-unknown', version: '0.0.0' };
}
// --- End Reading package.json ---


// --- Backup Directory Handling ---
/**
 * Ensures the backup directory exists and is within the project root.
 * @param backupPath The desired path for the backup directory (can be relative or absolute).
 * @param rootDir The root directory of the project to contain the backups.
 * @returns The validated, absolute path to the backup directory, or null if invalid.
 */
const ensureBackupDir = (backupPath: string, rootDir: string): string | null => {
  const resolvedBackupPath = path.resolve(rootDir, backupPath); // Resolve relative to root

  // Security Check: Ensure the resolved path is within the project root
  if (!resolvedBackupPath.startsWith(rootDir + path.sep) && resolvedBackupPath !== rootDir) {
    console.error(`Error: Backup path "${backupPath}" resolves outside the project boundary: ${resolvedBackupPath}`);
    return null; // Indicate failure
  }

  if (!existsSync(resolvedBackupPath)) {
    try {
      mkdirSync(resolvedBackupPath, { recursive: true });
      console.log(`Created backup directory: ${resolvedBackupPath}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error creating backup directory at ${resolvedBackupPath}: ${errorMessage}`);
      return null; // Indicate failure
    }
  } else {
    // Optional: Check if it's actually a directory if it exists
    try {
        const stats = statSync(resolvedBackupPath); // Use imported statSync directly
        if (!stats.isDirectory()) {
            console.error(`Error: Backup path ${resolvedBackupPath} exists but is not a directory.`);
            return null;
        }
    } catch (statError: any) {
        console.error(`Error accessing backup path ${resolvedBackupPath}: ${statError.message}`);
        return null;
    }
  }
  return resolvedBackupPath; // Return the validated absolute path
};

// Determine the desired backup path (relative or absolute from env var, or default)
const rawBackupPathInput = process.env.BACKUP_FILE_DIR || 'backups'; // Default relative path

// Ensure the backup directory exists and get the validated absolute path
const validatedBackupPath = ensureBackupDir(rawBackupPathInput, projectRoot);

if (!validatedBackupPath) {
    console.error("FATAL: Backup directory configuration is invalid or could not be created. Exiting.");
    process.exit(1); // Exit if backup path is invalid
}
// --- End Backup Directory Handling ---


export const config = {
  neo4jUri: process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4jUser: process.env.NEO4J_USER || "neo4j",
  neo4jPassword: process.env.NEO4J_PASSWORD || "password",
  mcpServerName: pkg.name,
  mcpServerVersion: pkg.version,
  logLevel: process.env.LOG_LEVEL || "info",
  environment: process.env.NODE_ENV || "development",
  backup: {
    maxBackups: parseInt(process.env.BACKUP_MAX_COUNT || '10', 10),
    backupPath: validatedBackupPath // Use the validated path
  },
  security: {
    // Internal auth is disabled by default, will implement later if needed
    authRequired: false
  }
}
