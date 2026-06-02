const Teacher = require('../models/Teacher');

const runAutoSeed = async () => {
  try {
    const count = await Teacher.countDocuments({});
    if (count > 0) return;

    console.log('[seed] No teachers found. Running auto-seed...');
    const { execSync } = require('child_process');
    execSync('node server/seed.js', { stdio: 'inherit', cwd: process.cwd() });
    console.log('[seed] Auto-seed complete.');
  } catch (error) {
    console.error('[seed] Auto-seed failed:', error.message);
  }
};

module.exports = { runAutoSeed };
