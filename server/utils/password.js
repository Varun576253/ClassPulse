const crypto = require('crypto');

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
};

const verifyPassword = (password, stored = '') => {
  const [scheme, iterations, salt, originalHash] = String(stored).split(':');

  if (scheme !== 'pbkdf2' || !iterations || !salt || !originalHash) {
    return false;
  }

  const hash = crypto
    .pbkdf2Sync(password, salt, Number(iterations), KEY_LENGTH, DIGEST)
    .toString('hex');

  const hashBuffer = Buffer.from(hash, 'hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');

  return hashBuffer.length === originalBuffer.length && crypto.timingSafeEqual(hashBuffer, originalBuffer);
};

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const generateCode = () => String(crypto.randomInt(100000, 1000000));

module.exports = {
  generateCode,
  hashCode,
  hashPassword,
  verifyPassword
};
