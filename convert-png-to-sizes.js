import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the PNG file
const pngPath = path.join(__dirname, 'public', 'icon', 'xVault.png');

// Icon directory
const iconDir = path.join(__dirname, 'public', 'icon');

// Extract sizes from wxt.config.ts
const getIconSizes = () => {
  try {
    // Read the wxt.config.ts file
    const configPath = path.join(__dirname, 'wxt.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract icon sizes using regex
    const iconRegex = /icons:\s*{([^}]*)}/s;
    const iconMatch = configContent.match(iconRegex);
    
    if (iconMatch && iconMatch[1]) {
      const iconSection = iconMatch[1];
      const sizeRegex = /(\d+):\s*['"](.*?)['"],?/g;
      
      const sizes = [];
      let match;
      while ((match = sizeRegex.exec(iconSection)) !== null) {
        sizes.push(parseInt(match[1], 10));
      }
      
      return sizes;
    }
    
    // Fallback to default sizes if parsing fails
    return [16, 32, 48, 96, 128];
  } catch (error) {
    console.error('Error reading config file:', error);
    // Fallback to default sizes
    return [16, 32, 48, 96, 128];
  }
};

// Remove existing icon files
const removeExistingIcons = () => {
  try {
    const files = fs.readdirSync(iconDir);
    
    for (const file of files) {
      // Skip the source PNG file
      if (file === 'xVault.png') continue;
      
      // Check if the file matches the pattern NxN.png
      if (/^\d+x\d+\.png$/.test(file)) {
        const filePath = path.join(iconDir, file);
        fs.unlinkSync(filePath);
        console.log(`Removed existing icon: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error removing existing icons:', error);
  }
};

// Convert PNG to different sizes
async function convertToSizes() {
  try {
    // Get sizes from config
    const sizes = getIconSizes();
    
    // Remove existing icon files
    removeExistingIcons();
    
    // Read the PNG file
    const pngBuffer = fs.readFileSync(pngPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir, { recursive: true });
    }
    
    // Convert to each size
    for (const size of sizes) {
      const outputPath = path.join(iconDir, `${size}x${size}.png`);
      
      console.log(`Converting to ${size}x${size}...`);
      
      await sharp(pngBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Created ${outputPath}`);
    }
    
    console.log('All PNG files have been generated successfully!');
  } catch (error) {
    console.error('Error converting PNG to sizes:', error);
  }
}

convertToSizes();