import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shared read/write access to src/data/pipeline.json for every stage + Arthur's orchestrator. */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIPELINE_PATH = path.join(path.resolve(__dirname, '..'), 'src', 'data', 'pipeline.json');

/** Read the pipeline state file, defaulting to {} if it doesn't exist yet. */
export function readPipeline() {
  return fs.existsSync(PIPELINE_PATH) ? JSON.parse(fs.readFileSync(PIPELINE_PATH, 'utf-8')) : {};
}

/** Merge `patch` into pipeline.json under `key` and persist. */
export function writePipeline(key, patch) {
  const pipeline = readPipeline();
  pipeline[key] = patch;
  fs.writeFileSync(PIPELINE_PATH, JSON.stringify(pipeline, null, 2));
}
