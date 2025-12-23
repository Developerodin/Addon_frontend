const fs = require('fs');
const path = require('path');

const sourceDir = path.join(process.cwd(), '.next/static');
const targetDir = path.join(process.cwd(), '.next/standalone/.next/static');

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
  if (fs.existsSync(sourceDir)) {
    copyRecursiveSync(sourceDir, targetDir);
    console.log('✓ Copied static files to standalone build');
  } else {
    console.log('⚠ Static files directory not found, skipping copy');
  }
} catch (error) {
  console.log('⚠ Failed to copy static files:', error.message);
  // Don't fail the build if copy fails
  process.exit(0);
}

