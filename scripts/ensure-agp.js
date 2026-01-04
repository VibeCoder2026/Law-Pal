const fs = require('fs');
const path = require('path');

const AGP_VERSION = '8.11.0';

const targets = [
  {
    name: '@react-native-async-storage/async-storage',
    file: path.join('node_modules', '@react-native-async-storage', 'async-storage', 'android', 'build.gradle'),
    insertIfMissing: true,
  },
  {
    name: 'react-native-blob-util',
    file: path.join('node_modules', 'react-native-blob-util', 'android', 'build.gradle'),
  },
  {
    name: 'react-native-pdf',
    file: path.join('node_modules', 'react-native-pdf', 'android', 'build.gradle'),
  },
  {
    name: 'react-native-safe-area-context',
    file: path.join('node_modules', 'react-native-safe-area-context', 'android', 'build.gradle'),
  },
  {
    name: 'react-native-screens',
    file: path.join('node_modules', 'react-native-screens', 'android', 'build.gradle'),
  },
];

function ensureAgpVersion(content, insertIfMissing) {
  const agpRegex = /classpath\s*['"]com\.android\.tools\.build:gradle:[^'\"]+['"]/g;
  if (agpRegex.test(content)) {
    return content.replace(agpRegex, (match) => {
      return match.replace(/:gradle:[^'\"]+/, `:gradle:${AGP_VERSION}`);
    });
  }

  if (!insertIfMissing) {
    return content;
  }

  const depsRegex = /dependencies\s*\{\s*\n/;
  if (!depsRegex.test(content)) {
    return content;
  }

  return content.replace(
    depsRegex,
    (match) => `${match}        classpath "com.android.tools.build:gradle:${AGP_VERSION}"\n`
  );
}

const failures = [];

targets.forEach((target) => {
  if (!fs.existsSync(target.file)) {
    failures.push(`${target.name}: missing ${target.file}`);
    return;
  }

  const before = fs.readFileSync(target.file, 'utf8');
  const after = ensureAgpVersion(before, target.insertIfMissing);

  if (before !== after) {
    fs.writeFileSync(target.file, after, 'utf8');
    console.log(`[ensure-agp] Updated ${target.name}`);
  } else {
    console.log(`[ensure-agp] OK ${target.name}`);
  }
});

if (failures.length > 0) {
  console.error('[ensure-agp] Missing files:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}