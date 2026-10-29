// The Windows build of CAGE BOSS II after `vite build --config vite.sequel.config.ts`:
// unpack Electron from the cache (tools/electron-dist.mjs), package the folder, stamp the icon
// into the exe, then wrap it as the portable .exe in release-sequel/.
//   npm run dist:sequel:win
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const dist = execFileSync(process.execPath, ['tools/electron-dist.mjs', 'win32-x64']).toString().trim();
rmSync('release-sequel/win-unpacked', { recursive: true, force: true });
rmSync('release-sequel/win-unpacked.tmp', { recursive: true, force: true });
run(`npx electron-builder --config electron-builder.sequel.json --win dir --x64 -c.win.signAndEditExecutable=false${dist ? ` -c.electronDist="${dist}"` : ''}`);
const version = JSON.parse(readFileSync('package.json', 'utf8')).sequelVersion;
run(`node tools/stamp-exe.mjs "release-sequel/win-unpacked/CAGE BOSS II.exe" build/icon-sequel.ico ${version}`);
run('npx electron-builder --config electron-builder.sequel.json --win portable --x64 --prepackaged release-sequel/win-unpacked -c.win.signAndEditExecutable=false --publish never');
