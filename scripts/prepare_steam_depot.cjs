const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const buildOutput = path.join(projectRoot, 'dist', 'steam-build-temp');
const source = path.join(buildOutput, 'win-unpacked');
const destination = path.join(projectRoot, 'dist', 'steam-depot', 'win-unpacked');
const executable = 'Shellbreak.exe';

function assertWithinProject(target) {
  const relative = path.relative(projectRoot, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to use a path outside the project output: ${target}`);
  }
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

assertWithinProject(source);
assertWithinProject(buildOutput);
assertWithinProject(destination);

const sourceExe = path.join(source, executable);
const sourceAsar = path.join(source, 'resources', 'app.asar');
if (!fs.existsSync(sourceExe) || !fs.existsSync(sourceAsar)) {
  throw new Error('Windows build output is incomplete. Run the Windows package build first.');
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(source, destination, { recursive: true, force: true });

const destinationExe = path.join(destination, executable);
const destinationAsar = path.join(destination, 'resources', 'app.asar');
if (sha256(sourceExe) !== sha256(destinationExe) || sha256(sourceAsar) !== sha256(destinationAsar)) {
  throw new Error('Steam depot copy verification failed.');
}

fs.rmSync(buildOutput, { recursive: true, force: true });

console.log(`Steam depot payload ready: ${destination}`);
console.log(`Executable icon and resources copied from the Windows build: ${executable}`);
