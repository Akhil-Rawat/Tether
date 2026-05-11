const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function exists(value) {
  return typeof value === 'string' && value.length > 0 && fs.existsSync(value);
}

function print(message) {
  process.stderr.write(`${message}\n`);
}

function findAdbFromPath() {
  try {
    const output = execSync('where.exe adb', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return output
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean);
  } catch {
    return '';
  }
}

function readLocalPropertiesSdkRoot() {
  const localPropertiesPath = path.join(process.cwd(), 'android', 'local.properties');

  if (!fs.existsSync(localPropertiesPath)) {
    return '';
  }

  try {
    const contents = fs.readFileSync(localPropertiesPath, 'utf8');
    const match = contents.match(/^\s*sdk\.dir\s*=\s*(.+)\s*$/m);

    if (!match) {
      return '';
    }

    return match[1].trim().replace(/\\:/g, ':').replace(/\\\\/g, '\\');
  } catch {
    return '';
  }
}

function candidateSdkRoots() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    readLocalPropertiesSdkRoot(),
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(process.env.USERPROFILE || '', 'Android', 'Sdk'),
    path.join(process.env.PROGRAMFILES || '', 'Android', 'Sdk'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Android', 'Sdk'),
    'C:\\AndroidSDK',
  ];

  return candidates.filter(value => typeof value === 'string' && value.length > 0);
}

function findSdkRoot() {
  for (const candidate of candidateSdkRoots()) {
    if (exists(path.join(candidate, 'platform-tools', 'adb.exe'))) {
      return candidate;
    }
  }

  return '';
}

const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
const adbFromPath = findAdbFromPath();
const adbFromAndroidHome = androidHome ? path.join(androidHome, 'platform-tools', 'adb.exe') : '';
const sdkRoot = findSdkRoot();

if (exists(adbFromAndroidHome)) {
  process.stdout.write(`Using Android SDK at ${androidHome}\n`);
  process.exit(0);
}

if (sdkRoot) {
  process.env.ANDROID_HOME = sdkRoot;
  process.env.ANDROID_SDK_ROOT = sdkRoot;
  process.stdout.write(`Using Android SDK at ${sdkRoot}\n`);
  process.exit(0);
}

if (adbFromPath) {
  const resolvedAdb = path.dirname(path.dirname(adbFromPath));
  process.stdout.write(`Using adb from PATH: ${adbFromPath}\n`);
  process.env.ANDROID_HOME = resolvedAdb;
  process.env.ANDROID_SDK_ROOT = resolvedAdb;
  process.exit(0);
}

if (androidHome && !exists(androidHome)) {
  print(`ANDROID_HOME is set to a non-existing path: ${androidHome}`);
} else if (androidHome) {
  print(`ANDROID_HOME is set to ${androidHome}, but platform-tools/adb.exe was not found there.`);
} else {
  print('ANDROID_HOME is not set.');
}

print('No valid Android SDK was found in common Windows locations.');
print('adb was not found on PATH.');
print('Install Android Studio or the Android SDK Platform-Tools, then set ANDROID_HOME/ANDROID_SDK_ROOT to the SDK root.');
print('Expected layout: <SDK root>\\platform-tools\\adb.exe and <SDK root>\\emulator\\emulator.exe');
process.exit(1);
