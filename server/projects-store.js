import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Shared read/write access to src/data/projects.json — the manager pipeline's job
 * record. Unlike pipeline-store.js (one overwritable slot per stage), this holds an
 * array of many projects, including finished ones kept around for later browsing
 * in a project's Hall (see src/pages/project-viewer/). The scheduled Claude Code
 * session that actually runs the manager loop (docs/MANAGER-RUNBOOK.md) writes this
 * file directly to disk rather than through this module — it doesn't run inside the
 * Vite process. This module exists for any Camelot-side code (routes, a future
 * owner-facing control) that needs the same read-modify-write.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_PATH = path.join(path.resolve(__dirname, '..'), 'src', 'data', 'projects.json');

function readFile() {
  if (!fs.existsSync(PROJECTS_PATH)) return { projects: [], lockedAt: null };
  return JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf-8'));
}

/** Read the full projects array, defaulting to [] if the file doesn't exist yet. */
export function readProjects() {
  const data = readFile();
  return Array.isArray(data.projects) ? data.projects : [];
}

/** Overwrite the projects array, preserving the file's other top-level fields (e.g. lockedAt). */
export function writeProjects(projects) {
  const data = readFile();
  data.projects = projects;
  fs.writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2));
}

/** Look up one project by id, or null if it doesn't exist. */
export function getProject(projectId) {
  return readProjects().find((p) => p.id === projectId) || null;
}
