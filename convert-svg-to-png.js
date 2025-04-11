import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
//run node convert-svg-to-png.js in terminal
// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SVG file
const svgPath = path.join(__dirname, 'public', 'icon', 'xvault.svg');

// Sizes required for browser extension
const sizes = [16, 32, 48, 96, 128];

// Read the SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert SVG to PNG for each size
async function convertToPng() {
  try {
    for (const size of sizes) {
      const outputPath = path.join(__dirname, 'public', 'icon', `${size}x${size}.png`);
      
      console.log(`Converting to ${size}x${size}...`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Created ${outputPath}`);
    }
    
    console.log('All PNG files have been generated successfully!');
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
  }
}

convertToPng();