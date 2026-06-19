#!/usr/bin/env node

/**
 * docs-validate.ts — Documentation validation script.
 *
 * Checks:
 *  1. INDEX.md — every referenced doc exists
 *  2. MASTER_FEATURE_LIST.md — every feature doc reference exists
 *  3. PLANNING.md — every feature in every phase appears in MASTER_FEATURE_LIST
 *  4. Cross-references — every `docs/XX_*.md` reference in `.md` files resolves
 *  5. Backward refs — every doc in `docs/` is listed in INDEX.md
 *
 * Usage: npx tsx scripts/docs-validate.ts
 * Add to CI or pre-commit: npm run docs:check
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DOCS_DIR = join(ROOT, "docs");

let exitCode = 0;
let errors: string[] = [];
let warnings: string[] = [];

function error(msg: string) {
  errors.push(msg);
  exitCode = 1;
}

function warn(msg: string) {
  warnings.push(msg);
}

/** Read file content, gracefully handling missing files. */
function readFileSafe(p: string): string | null {
  try {
    return readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

/** List all `.md` files under `docs/` (non-recursive for now). */
function listDocFiles(): string[] {
  return readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => statSync(join(DOCS_DIR, f)).isFile());
}

/** Extract all `docs/XX_*.md` references from markdown content. */
function extractDocRefs(content: string): string[] {
  const refs: string[] = [];
  const re = /docs\/([\w._-]+\.md)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    refs.push(m[1]);
  }
  return [...new Set(refs)];
}

// ────────────────
//  1. INDEX.md check
// ────────────────
function checkIndex() {
  const idx = readFileSafe(join(DOCS_DIR, "INDEX.md"));
  if (!idx) {
    error("INDEX.md not found");
    return;
  }

  // Find all `XX_NAME.md` references
  const refs = extractDocRefs(idx);
  for (const ref of refs) {
    const p = join(DOCS_DIR, ref);
    if (!existsSync(p)) {
      error(`INDEX.md references "${ref}" but file does not exist`);
    }
  }
}

// ────────────────
//  2. MASTER_FEATURE_LIST.md doc reference check
// ────────────────
function checkMasterFeatureList() {
  const mfl = readFileSafe(join(DOCS_DIR, "MASTER_FEATURE_LIST.md"));
  if (!mfl) {
    error("MASTER_FEATURE_LIST.md not found");
    return;
  }

  // Each feature section has a "**Docs:**" line
  const docRefs = extractDocRefs(mfl);
  for (const ref of docRefs) {
    const p = join(DOCS_DIR, ref);
    if (!existsSync(p)) {
      error(`MASTER_FEATURE_LIST.md references "${ref}" but file does not exist`);
    }
  }
}

// ────────────────
//  3. PLANNING.md ↔ MASTER_FEATURE_LIST.md alignment
// ────────────────
function checkPlanningAlignment() {
  const plan = readFileSafe(join(DOCS_DIR, "PLANNING.md"));
  const mfl = readFileSafe(join(DOCS_DIR, "MASTER_FEATURE_LIST.md"));
  if (!plan) {
    error("PLANNING.md not found");
    return;
  }
  if (!mfl) {
    return; // already reported
  }

  // Extract feature names from PLANNING.md: bullet points under "### Features"
  // e.g. "- Project scaffolding (Vite, TypeScript, Three.js, React, Zustand, Vitest)"
  const planFeatures: string[] = [];
  const inFeaturesSection = /^### Features$/m;
  const featuresMatch = plan.match(/(?:^|\n)### Features\n([\s\S]*?)(?=\n###|\n##|$)/g);
  if (featuresMatch) {
    for (const section of featuresMatch) {
      const bullets = section.match(/^- (.+)$/gm);
      if (bullets) {
        for (const b of bullets) {
          planFeatures.push(b.replace(/^- /, "").trim());
        }
      }
    }
  }

  // Extract feature names from MASTER_FEATURE_LIST: "### X.Y FeatureName"
  const mflFeatures: string[] = [];
  const mflMatches = mfl.matchAll(/^### \d+\.\d+ (.+)$/gm);
  for (const match of mflMatches) {
    mflFeatures.push(match[1].trim());
  }

  // Check every planning feature has a match in MFL (fuzzy)
  for (const pf of planFeatures) {
    // Normalize: lower case, strip parentheticals, strip non-alphanumeric for matching
    const normalized = pf
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const found = mflFeatures.some((mf) => {
      const mfNorm = mf
        .toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      // Check if each word from the plan feature (up to 4) appears in the MFL feature
      const pfWords = normalized.split(/\s+/).filter(Boolean);
      const keyWords = pfWords.slice(0, 4);
      const mfWords = mfNorm.split(/\s+/).filter(Boolean);
      const matchCount = keyWords.filter((w) => w.length >= 2 && mfWords.includes(w)).length;
      return keyWords.length <= 1 ? matchCount >= 1 : matchCount >= 2;
    });
    if (!found) {
      warn(`PLANNING.md feature "${pf}" has no matching entry in MASTER_FEATURE_LIST.md`);
    }
  }
}

// ────────────────
//  4. Cross-reference check
// ────────────────
function checkCrossReferences() {
  const docFiles = listDocFiles();

  for (const file of docFiles) {
    const content = readFileSafe(join(DOCS_DIR, file));
    if (!content) continue;

    const refs = extractDocRefs(content);
    for (const ref of refs) {
      if (ref === file) continue; // self-reference allowed
      const p = join(DOCS_DIR, ref);
      if (!existsSync(p)) {
        error(`${file} references "docs/${ref}" but file does not exist`);
      }
    }
  }
}

// ────────────────
//  5. Backward refs — every doc in INDEX.md
// ────────────────
function checkBackwardRefs() {
  const idx = readFileSafe(join(DOCS_DIR, "INDEX.md"));
  if (!idx) return;

  const docFiles = listDocFiles();
  for (const file of docFiles) {
    if (file === "INDEX.md" || file === "MASTER_FEATURE_LIST.md" || file.startsWith("templates/")) continue;
    if (!idx.includes(file)) {
      warn(`"${file}" is not listed in INDEX.md`);
    }
  }
}

// ────────────────
//  Run all checks
// ────────────────
checkIndex();
checkMasterFeatureList();
checkPlanningAlignment();
checkCrossReferences();
checkBackwardRefs();

// ────────────────
//  Report
// ────────────────
if (errors.length > 0 || warnings.length > 0) {
  console.log("\n=== Docs Validation Report ===\n");
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    for (const e of errors) console.log(`   ${e}`);
    console.log();
  }
  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`   ${w}`);
    console.log();
  }
} else {
  console.log("✅ All docs checks passed.");
}

process.exit(exitCode);
