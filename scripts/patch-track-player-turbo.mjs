import fs from "node:fs";
import path from "node:path";

const modulePath = path.join(
  process.cwd(),
  "node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt",
);

if (!fs.existsSync(modulePath)) {
  process.exit(0);
}

let src = fs.readFileSync(modulePath, "utf8");

if (!src.includes("= scope.launch") && !src.includes("=\n        scope.launch")) {
  // Ensure multiline metadata method is closed after prior turbo patch runs.
  src = src.replace(
    /(fun updateMetadataForTrack[\s\S]*?        \}\n)(\n    @ReactMethod\n    fun updateNowPlayingMetadata)/,
    "$1    }\n$2",
  );
  if (src !== fs.readFileSync(modulePath, "utf8")) {
    fs.writeFileSync(modulePath, src);
    console.log("[patch-track-player] fixed updateMetadataForTrack closing brace");
  }
  process.exit(0);
}

src = src.replace(/\)\s*=\s*scope\.launch\s*\{/g, ") {\n        scope.launch {");
src = src.replace(/\)\s*=\s*\n\s*scope\.launch\s*\{/g, ") {\n        scope.launch {");

const parts = src.split(/(?=@ReactMethod)/);
const out = [parts[0]];

for (let i = 1; i < parts.length; i++) {
  let part = parts[i];
  if (!part.includes("scope.launch {")) {
    out.push(part);
    continue;
  }

  const closeMatch = part.match(/\n( {4})\}\n(?=\n    @ReactMethod|\n\}$)/);
  if (closeMatch && !part.includes(`${closeMatch[1]}}\n${closeMatch[1]}}`)) {
    const indent = closeMatch[1];
    const closeIdx = part.lastIndexOf(`\n${indent}}\n`);
    if (closeIdx !== -1) {
      part = `${part.slice(0, closeIdx + indent.length + 3)}\n${indent}}${part.slice(closeIdx + indent.length + 3)}`;
    }
  }

  out.push(part);
}

let patched = out.join("");
patched = patched.replace(
  /(fun updateMetadataForTrack[\s\S]*?        \}\n)(\n    @ReactMethod\n    fun updateNowPlayingMetadata)/,
  "$1    }\n$2",
);

fs.writeFileSync(modulePath, patched);
console.log("[patch-track-player] applied TurboModule compatibility patch");
