const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDirectory = path.join(process.cwd(), 'public', 'icons');

// Create the icons directory if it doesn't exist
if (!fs.existsSync(iconDirectory)) {
  fs.mkdirSync(iconDirectory, { recursive: true });
}

// Base icon should be at least 512x512
const baseIcon = path.join(process.cwd(), 'public', 'base-icon.png');

sizes.forEach(size => {
  sharp(baseIcon)
    .resize(size, size)
    .toFile(path.join(iconDirectory, `icon-${size}x${size}.png`))
    .then(info => {
      console.log(`Generated ${size}x${size} icon`);
    })
    .catch(err => {
      console.error(`Error generating ${size}x${size} icon:`, err);
    });
}); 