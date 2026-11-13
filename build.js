const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[*] Installing frontend dependencies...');
execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

console.log('[*] Compiling frontend production bundle with Vite...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

const distSrc = path.join(__dirname, 'frontend', 'dist');
// Mirror output to 'build', 'Build', and 'dist' at the repository root
['dist', 'build', 'Build'].forEach((dirName) => {
  const dest = path.join(__dirname, dirName);
  try {
    fs.cpSync(distSrc, dest, { recursive: true, force: true });
    console.log(`[+] Mirrored bundle to root ./${dirName}`);
  } catch (err) {
    console.error(`[-] Failed copying to ${dirName}:`, err.message);
  }
});
console.log('[+] E-RISE Build complete!');
