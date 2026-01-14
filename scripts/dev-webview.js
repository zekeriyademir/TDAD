#!/usr/bin/env node

/**
 * Development script for TDAD webview
 * This script helps test the React webview outside of VS Code
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TDAD Webview Development Server...\n');

// Start Vite dev server
const vite = spawn('npx', ['vite', '--port', '3000'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development server...');
  vite.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping development server...');
  vite.kill('SIGTERM');
  process.exit(0);
});

vite.on('close', (code) => {
  console.log(`\n📦 Vite process exited with code ${code}`);
  process.exit(code);
});
