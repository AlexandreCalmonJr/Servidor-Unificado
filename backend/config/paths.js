const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const CONFIG_KEYS_DIR = path.join(BACKEND_DIR, 'config', 'keys');

module.exports = {
  ROOT_DIR,
  BACKEND_DIR,
  FRONTEND_DIR,
  PUBLIC_DIR,
  SCRIPTS_DIR,
  LOGS_DIR,
  CONFIG_KEYS_DIR,
};
