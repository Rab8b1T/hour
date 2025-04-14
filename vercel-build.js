// This script runs during the Vercel build process to check environment variables
const fs = require('fs');

console.log('Running Vercel build script check...');
console.log('Current directory:', process.cwd());
console.log('Environment variables check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- MONGODB_URI set:', process.env.MONGODB_URI ? 'Yes' : 'No');

if (!process.env.MONGODB_URI) {
  console.error('WARNING: MONGODB_URI environment variable is not set!');
  console.error('The application may not work correctly without it.');
  console.error('Please set this variable in your Vercel project settings.');
  
  // Create a warning file that can be checked later
  fs.writeFileSync('./missing-env-vars.txt', 'MONGODB_URI is missing');
} else {
  console.log('All required environment variables are set.');
  
  // Remove warning file if it exists
  if (fs.existsSync('./missing-env-vars.txt')) {
    fs.unlinkSync('./missing-env-vars.txt');
  }
}

// Continue with build
console.log('Continuing with build process...');