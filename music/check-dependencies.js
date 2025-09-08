#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking dependencies...');

// Check if music-metadata is installed
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const hasMusicMetadata = packageJson.dependencies && packageJson.dependencies['music-metadata'];
    
    if (hasMusicMetadata) {
        console.log('✅ music-metadata dependency found');
        
        // Try to import it dynamically to test ES module compatibility
        (async () => {
            try {
                await import('music-metadata');
                console.log('✅ music-metadata ES module import successful');
            } catch (error) {
                console.warn('⚠️  music-metadata import failed:', error.message);
                console.warn('   The bot will still work but with limited metadata extraction');
            }
        })();
    } else {
        console.warn('⚠️  music-metadata not found in dependencies');
        console.warn('   Install with: npm install music-metadata');
    }
} catch (error) {
    console.error('❌ Error checking dependencies:', error.message);
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 14) {
    console.error('❌ Node.js version 14 or higher is required');
    console.error(`   Current version: ${nodeVersion}`);
    process.exit(1);
} else {
    console.log(`✅ Node.js version ${nodeVersion} is compatible`);
}

console.log('🎵 Dependencies check complete!');
console.log('');