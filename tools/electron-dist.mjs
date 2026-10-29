// Unpack Electron from electron's download cache into .electron-dist/ (once), so electron-builder
// copies a folder instead of extracting a zip and renaming it. On this machine that rename fails
// with EPERM (antivirus, or the project living under %TEMP%), which broke `dist:sequel:win`.
//   node tools/electron-dist.mjs [platform-arch]   (default win32-x64)
// Prints the folder. If the zip isn't cached yet, prints nothing: run a normal build once first.
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const target = process.argv[2] ?? 'win32-x64';
const version = JSON.parse(execFileSync(process.execPath, ['-p', 'JSON.stringify(require("electron/package.json"))']).toString()).version;
const out = join('.electron-dist', `${version}-${target}`);
const exe = target.startsWith('win32') ? 'electron.exe' : target.startsWith('darwin') ? 'Electron.app' : 'electron';
if (existsSync(join(out, exe))) {
  console.log(out);
  process.exit(0);
}

const caches = [
  process.env.ELECTRON_CACHE,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'electron', 'Cache'),
  join(homedir(), '.cache', 'electron'),
  join(homedir(), 'Library', 'Caches', 'electron'),
].filter(Boolean);
const want = `electron-v${version}-${target}.zip`;
const find = (dir, depth = 0) => {
  if (!existsSync(dir) || depth > 2) return null;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === want) return p;
    if (statSync(p).isDirectory()) {
      const hit = find(p, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
};
const zip = caches.map((c) => find(c)).find(Boolean);
if (!zip) process.exit(0);
mkdirSync(out, { recursive: true });
// Windows 10+ ships bsdtar, which reads zips; elsewhere unzip does it
try {
  execFileSync('tar', ['-xf', zip, '-C', out], { stdio: 'ignore' });
} catch {
  execFileSync('unzip', ['-q', '-o', zip, '-d', out], { stdio: 'ignore' });
}
console.log(out);
