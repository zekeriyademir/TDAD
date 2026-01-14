const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const mediaSrc = path.join(__dirname, '../media');
const mediaDest = path.join(__dirname, '../out/media');

console.log(`Copying media from ${mediaSrc} to ${mediaDest}`);
try {
    copyDir(mediaSrc, mediaDest);
    console.log('Media files copied successfully.');
} catch (err) {
    console.error('Error copying media files:', err);
    process.exit(1);
}

