import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const manifestPath = path.join(root, "manifest.xml");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const manifestXml = fs.readFileSync(manifestPath, "utf8");
const manifestVersionMatch = manifestXml.match(/<Version>([^<]+)<\/Version>/);

if (!manifestVersionMatch) {
  throw new Error("Unable to find the manifest version in manifest.xml.");
}

const expectedManifestVersion = `${packageJson.version}.0`;
const actualManifestVersion = manifestVersionMatch[1];

if (actualManifestVersion !== expectedManifestVersion) {
  throw new Error(
    `Manifest/package version mismatch. package.json=${packageJson.version}, manifest.xml=${actualManifestVersion}, expected manifest=${expectedManifestVersion}.`
  );
}

console.log(`Version sync OK: ${packageJson.version} -> ${actualManifestVersion}`);
