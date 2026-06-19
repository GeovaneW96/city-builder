#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const DOC_MAPPINGS = [
  { prefix: "src/simulation/economy/", doc: "docs/05_ECONOMY_AND_BALANCING.md" },
  { prefix: "src/simulation/buildings/", doc: "docs/07_BUILDINGS_AND_ZONES.md" },
  { prefix: "src/simulation/progression/", doc: "docs/06_PROGRESSION_AND_UNLOCKS.md" },
  { prefix: "src/simulation/traffic/", doc: "docs/26_TRAFFIC_MODEL.md" },
  { prefix: "src/simulation/grid/", doc: "docs/08_MAP_GRID_AND_TERRAIN.md" },
  { prefix: "src/simulation/scenarios/", doc: "docs/22_SCENARIOS.md" },
  { prefix: "src/simulation/services/", doc: "docs/04_SIMULATION_SYSTEMS.md" },
  { prefix: "src/simulation/demand/", doc: "docs/02_CORE_GAMEPLAY_LOOP.md" },
  { prefix: "src/simulation/store.ts", doc: "docs/13_TECHNICAL_ARCHITECTURE.md" },
  { prefix: "src/simulation/", doc: "docs/04_SIMULATION_SYSTEMS.md" },
  { prefix: "src/rendering/", doc: "docs/14_THREEJS_RENDERING_GUIDE.md" },
  { prefix: "src/data/balance/", doc: "docs/05_ECONOMY_AND_BALANCING.md" },
  { prefix: "src/data/buildings/", doc: "docs/07_BUILDINGS_AND_ZONES.md" },
  { prefix: "src/data/unlocks/", doc: "docs/06_PROGRESSION_AND_UNLOCKS.md" },
  { prefix: "src/data/scenarios/", doc: "docs/22_SCENARIOS.md" },
  { prefix: "src/shared/events/", doc: "docs/13_TECHNICAL_ARCHITECTURE.md" },
  { prefix: "src/shared/types/", doc: "docs/15_DATA_MODEL_AND_SAVE_SYSTEM.md" },
  { prefix: "src/save/", doc: "docs/15_DATA_MODEL_AND_SAVE_SYSTEM.md" },
  { prefix: "src/ui/", doc: "docs/10_UI_UX_DESIGN.md" },
];

const errors = [];

function getStagedFiles() {
  return execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf-8",
  })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function checkDocs(staged) {
  const sorted = [...DOC_MAPPINGS].sort((a, b) => b.prefix.length - a.prefix.length);
  const stagedSet = new Set(staged);
  const required = new Set();

  for (const file of staged) {
    const match = sorted.find((m) => file.startsWith(m.prefix));
    if (match) required.add(match.doc);
  }

  for (const doc of [...required].filter((doc) => !stagedSet.has(doc))) {
    errors.push(`Staged source changes require updating ${doc}`);
  }
}

function checkTestAccompaniment(staged) {
  const simulationFiles = staged.filter(
    (f) => f.startsWith("src/simulation/") && !f.endsWith(".test.ts"),
  );
  if (simulationFiles.length === 0) return;

  const hasTestFile = staged.some((f) => f.endsWith(".test.ts"));
  if (!hasTestFile) {
    errors.push(
      `Staged simulation changes without a test file (*.test.ts)\n  ${simulationFiles.join("\n  ")}`,
    );
  }
}

function checkNoTestOnly(staged) {
  const testFiles = staged.filter((f) => f.endsWith(".test.ts"));
  if (testFiles.length === 0) return;

  for (const file of testFiles) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes("it.only(") ||
        line.includes("describe.only(") ||
        line.includes("test.only(")
      ) {
        errors.push(`${file}:${i + 1} — remove .only() before committing`);
      }
    }
  }
}

function checkIndexMdDrift(staged) {
  const newDocFiles = staged.filter(
    (f) => f.startsWith("docs/") && f.endsWith(".md") && f !== "docs/INDEX.md",
  );
  if (newDocFiles.length === 0) return;

  if (!existsSync("docs/INDEX.md")) {
    errors.push(`docs/INDEX.md is missing — add it and list new docs`);
    return;
  }

  const indexContent = readFileSync("docs/INDEX.md", "utf-8");
  const newFiles = newDocFiles.filter((f) => !indexContent.includes(f));

  if (newFiles.length > 0) {
    errors.push(`New doc files not listed in docs/INDEX.md:\n  ${newFiles.join("\n  ")}`);
  }
}

function main() {
  const staged = getStagedFiles();
  if (staged.length === 0) process.exit(0);

  checkDocs(staged);
  checkTestAccompaniment(staged);
  checkNoTestOnly(staged);
  checkIndexMdDrift(staged);

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`ERROR: ${err}`);
    }
    console.error("To bypass this check: git commit --no-verify");
    process.exit(1);
  }
}

main();
