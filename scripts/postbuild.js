const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(process.cwd(), '.next/standalone');

const copyTargets = [
  {
    source: path.join(process.cwd(), '.next/static'),
    target: path.join(standaloneDir, '.next/static'),
    label: 'static files',
  },
  {
    source: path.join(process.cwd(), 'public'),
    target: path.join(standaloneDir, 'public'),
    label: 'public assets',
  },
];

/**
 * Recursively copies files and directories from src to dest.
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

try {
  let copiedCount = 0;

  for (const { source, target, label } of copyTargets) {
    if (!fs.existsSync(source)) {
      console.log(`⚠ ${label} directory not found, skipping copy`);
      continue;
    }

    copyRecursiveSync(source, target);
    console.log(`✓ Copied ${label} to standalone build`);
    copiedCount += 1;
  }

  if (copiedCount === 0) {
    console.log('⚠ No standalone assets were copied');
  }
} catch (error) {
  console.log('⚠ Failed to copy standalone assets:', error.message);
  process.exit(0);
}
