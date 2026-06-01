const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const storageRoot = path.join(__dirname, '..', 'storage', 'assessments');

const mimeExtensions = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt'
};

const ensureDir = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const sanitizePart = (value) => String(value || 'file')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 90) || 'file';

const extensionFor = (fileName, mimeType) => {
  const current = path.extname(fileName || '').toLowerCase();
  if (current && current.length <= 8) {
    return current;
  }
  return mimeExtensions[mimeType] || '.bin';
};

const decodeUpload = (file = {}) => {
  const data = file.dataUrl || file.base64 || file.contentBase64 || '';
  if (!data) {
    throw new Error('Uploaded file payload is missing file data.');
  }

  if (data.startsWith('data:')) {
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Uploaded file data URL is invalid.');
    }

    return {
      buffer: Buffer.from(match[2], 'base64'),
      mimeType: file.mimeType || file.type || match[1]
    };
  }

  return {
    buffer: Buffer.from(data, 'base64'),
    mimeType: file.mimeType || file.type || 'application/octet-stream'
  };
};

const toFileUrl = (folderId, fileName) =>
  `/api/assessments/files/${encodeURIComponent(folderId)}/${encodeURIComponent(fileName)}`;

const saveUploadedFile = async ({ folderId, file }) => {
  const safeFolder = sanitizePart(folderId);
  const { buffer, mimeType } = decodeUpload(file);
  const originalFileName = file.name || file.fileName || 'upload';
  const ext = extensionFor(originalFileName, mimeType);
  const baseName = sanitizePart(path.basename(originalFileName, path.extname(originalFileName)));
  const storedFileName = `${randomUUID()}-${baseName}${ext}`;
  const dir = path.join(storageRoot, safeFolder);
  await ensureDir(dir);
  await fs.promises.writeFile(path.join(dir, storedFileName), buffer);

  return {
    fileUrl: toFileUrl(safeFolder, storedFileName),
    storedFileName,
    originalFileName,
    mimeType,
    size: buffer.length
  };
};

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const createThumbnail = async ({ folderId, fileUrl, mimeType, label }) => {
  if (String(mimeType || '').startsWith('image/')) {
    return fileUrl;
  }

  const safeFolder = sanitizePart(folderId);
  const dir = path.join(storageRoot, safeFolder);
  await ensureDir(dir);
  const title = escapeXml(label || 'Answer sheet').slice(0, 40);
  const extLabel = escapeXml((mimeExtensions[mimeType] || 'file').replace('.', '').toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
  <rect width="320" height="420" rx="18" fill="#f8fafc"/>
  <rect x="42" y="38" width="236" height="344" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="70" y="86" width="180" height="14" rx="7" fill="#dbeafe"/>
  <rect x="70" y="122" width="150" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="70" y="148" width="168" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="70" y="174" width="128" height="10" rx="5" fill="#e2e8f0"/>
  <text x="160" y="255" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#11233f">${extLabel}</text>
  <text x="160" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#475569">${title}</text>
</svg>`;
  const thumbnailName = `${randomUUID()}-thumbnail.svg`;
  await fs.promises.writeFile(path.join(dir, thumbnailName), svg, 'utf8');
  return toFileUrl(safeFolder, thumbnailName);
};

const resolveStoredPath = (folderId, fileName) => {
  const safeFolder = sanitizePart(folderId);
  const safeFile = path.basename(fileName || '');
  const resolved = path.resolve(storageRoot, safeFolder, safeFile);
  const folderPath = path.resolve(storageRoot, safeFolder);

  if (!resolved.startsWith(folderPath)) {
    throw new Error('Invalid file path.');
  }

  return resolved;
};

const resolveFileUrl = (fileUrl = '') => {
  const match = String(fileUrl).match(/\/api\/assessments\/files\/([^/]+)\/([^/?#]+)/);
  if (!match) {
    throw new Error('Stored file URL is invalid.');
  }

  return resolveStoredPath(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
};

module.exports = {
  createThumbnail,
  resolveFileUrl,
  resolveStoredPath,
  saveUploadedFile,
  storageRoot
};
