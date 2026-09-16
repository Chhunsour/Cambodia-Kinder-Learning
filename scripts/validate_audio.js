/**
 * Audio Validation and Size Summary CLI Runner for Koki.
 *
 * Runs integrity checks on manifests, scans curriculum references,
 * flags unreviewed Khmer pronunciation, and outputs bundled audio size metrics.
 */

const fs = require("fs");
const path = require("path");

// Resolve paths
const FILES_DIR = path.resolve(__dirname, "../assets/audio/files");

console.log("==================================================================");
console.log("🔊 KOKI PRODUCTION AUDIO & NARRATION VALIDATION REPORT");
console.log("==================================================================\n");

// Read manifest files directly to validate static metadata without requiring TypeScript runtime
const manifests = [
  { name: "Khmer Manifest", file: path.resolve(__dirname, "../assets/audio/manifests/khmer.ts") },
  { name: "English Manifest", file: path.resolve(__dirname, "../assets/audio/manifests/english.ts") },
  { name: "Koki Manifest", file: path.resolve(__dirname, "../assets/audio/manifests/koki.ts") },
  { name: "SFX Manifest", file: path.resolve(__dirname, "../assets/audio/manifests/sfx.ts") },
];

let totalKeys = 0;
let needsReviewCount = 0;
let placeholderCount = 0;
let missingFilesCount = 0;
const issues = [];
const groupSummary = {
  Khmer: { total: 0, needsReview: 0, placeholders: 0 },
  English: { total: 0, needsReview: 0, placeholders: 0 },
  Koki: { total: 0, needsReview: 0, placeholders: 0 },
  SFX: { total: 0, needsReview: 0, placeholders: 0 },
};

manifests.forEach(({ name, file }) => {
  if (!fs.existsSync(file)) {
    issues.push({ severity: "ERROR", message: `Missing manifest file: ${file}` });
    return;
  }

  const content = fs.readFileSync(file, "utf8");
  // Simple regex parser for key definitions
  const keyMatches = content.matchAll(/([a-zA-Z0-9_]+):\s*{\s*key:\s*"([^"]+)"/g);
  for (const m of keyMatches) {
    totalKeys++;
    const key = m[2];

    // Find block
    const blockStart = m.index;
    const blockEnd = content.indexOf("},", blockStart);
    const block = blockEnd !== -1 ? content.slice(blockStart, blockEnd) : content.slice(blockStart, blockStart + 400);

    // Extract file
    const fileMatch = block.match(/require\("\.\.\/files\/([^"]+)"\)/);
    const reviewMatch = block.match(/reviewStatus:\s*["']([^"']+)["']/);
    const transcriptMatch = block.match(/transcript:\s*["'`]([^"'`]+)["'`]/);

    const group = name.split(" ")[0];
    if (groupSummary[group]) {
      groupSummary[group].total++;
    }

    if (fileMatch) {
      const filename = fileMatch[1];
      const diskPath = path.join(FILES_DIR, filename);
      if (!fs.existsSync(diskPath)) {
        missingFilesCount++;
        issues.push({ severity: "ERROR", key, message: `Referenced audio file not found on disk: ${filename}` });
      }
    } else {
      issues.push({ severity: "ERROR", key, message: `Missing require() file reference` });
    }

    if (reviewMatch) {
      const status = reviewMatch[1];
      if (status === "needs_review") {
        needsReviewCount++;
        if (groupSummary[group]) groupSummary[group].needsReview++;
        issues.push({
          severity: "NEEDS LANGUAGE REVIEW",
          key,
          message: `Khmer educational pronunciation requires manual native speaker approval`,
        });
      } else if (status === "placeholder") {
        placeholderCount++;
        if (groupSummary[group]) groupSummary[group].placeholders++;
        issues.push({ severity: "WARNING", key, message: `Marked as temporary placeholder audio` });
      }
    }

    if (group !== "SFX" && !transcriptMatch) {
      issues.push({ severity: "WARNING", key, message: `Missing text transcript for educational voice asset` });
    }
  }
});

console.log(`Referenced audio keys: ${totalKeys}`);
console.log(`Resolved:             ${totalKeys - missingFilesCount}`);
console.log(`Missing files:        ${missingFilesCount}`);
console.log(`Needs review:         ${needsReviewCount}`);
console.log(`Placeholders:         ${placeholderCount}\n`);

console.log("--- Group Metrics ---");
for (const [group, metrics] of Object.entries(groupSummary)) {
  console.log(`  ${group.padEnd(10)}: ${metrics.total} keys (Needs Review: ${metrics.needsReview}, Placeholders: ${metrics.placeholders})`);
}

// Check bundled size
console.log("\n--- Bundled Audio Size Summary ---");
let totalBytes = 0;
let groupBytes = { Khmer: 0, English: 0, Koki: 0, SFX: 0 };

if (fs.existsSync(FILES_DIR)) {
  const diskFiles = fs.readdirSync(FILES_DIR);
  for (const f of diskFiles) {
    if (!f.endsWith(".m4a")) continue;
    const s = fs.statSync(path.join(FILES_DIR, f)).size;
    totalBytes += s;
    if (f.startsWith("km_")) groupBytes.Khmer += s;
    else if (f.startsWith("en_")) groupBytes.English += s;
    else if (f.startsWith("koki_")) groupBytes.Koki += s;
    else if (f.startsWith("sfx_")) groupBytes.SFX += s;
  }
}

function fmt(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

console.log(`  Khmer lesson audio:   ${fmt(groupBytes.Khmer)}`);
console.log(`  English starter audio:${fmt(groupBytes.English)}`);
console.log(`  Koki dialogue:        ${fmt(groupBytes.Koki)}`);
console.log(`  SFX:                  ${fmt(groupBytes.SFX)}`);
console.log(`  Total bundled audio:  ${fmt(totalBytes)}\n`);

console.log("--- Validation Findings ---");
const errors = issues.filter((i) => i.severity === "ERROR");
const languageReviews = issues.filter((i) => i.severity === "NEEDS LANGUAGE REVIEW");
const warnings = issues.filter((i) => i.severity === "WARNING");

if (errors.length > 0) {
  console.log(`❌ ${errors.length} ERRORS:`);
  errors.forEach((e) => console.log(`   [ERROR] ${e.key || ""}: ${e.message}`));
} else {
  console.log("✓ Zero ERRORS detected.");
}

if (languageReviews.length > 0) {
  console.log(`\n⚠️  ${languageReviews.length} ITEMS NEED LANGUAGE REVIEW (Khmer Educational Pronunciation Safety):`);
  languageReviews.slice(0, 5).forEach((r) => console.log(`   [NEEDS LANGUAGE REVIEW] ${r.key}: ${r.message}`));
  if (languageReviews.length > 5) {
    console.log(`   ... and ${languageReviews.length - 5} more Khmer educational assets awaiting native speaker audit.`);
  }
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} WARNINGS:`);
  warnings.forEach((w) => console.log(`   [WARNING] ${w.key || ""}: ${w.message}`));
}

console.log("\n==================================================================");
if (errors.length === 0) {
  console.log("🎉 AUDIT PASSED: Audio manifests and bundled assets are consistent!");
  process.exit(0);
} else {
  console.log("❌ AUDIT FAILED: Fix the critical audio errors listed above.");
  process.exit(1);
}
