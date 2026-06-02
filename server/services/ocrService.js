const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const { resolveFileUrl } = require('./assessmentStorageService');

const cleanText = (text = '') => String(text)
  .replace(/\u0000/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const languageToTesseract = (language = 'English') => {
  const normalized = String(language).toLowerCase();
  if (normalized.includes('hindi')) return 'eng+hin';
  if (normalized.includes('telugu')) return 'eng+tel';
  if (normalized.includes('tamil')) return 'eng+tam';
  if (normalized.includes('marathi')) return 'eng+mar';
  return 'eng';
};

const preprocessImageBuffer = async (buffer) => {
  const original = await sharp(buffer, { failOn: 'none' }).metadata();
  const targetWidth = original.width && original.width < 1200
    ? Math.min(1800, original.width * 2)
    : undefined;
  let pipeline = sharp(buffer, { failOn: 'none' }).rotate();
  if (targetWidth) {
    pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: false });
  }
  const processed = await pipeline
    .grayscale()
    .normalize()
    .median(1)
    .sharpen({ sigma: 1.1 })
    .linear(1.18, -8)
    .png({ compressionLevel: 6 })
    .toBuffer();
  const final = await sharp(processed, { failOn: 'none' }).metadata();

  return {
    buffer: processed,
    metadata: {
      originalWidth: original.width,
      originalHeight: original.height,
      originalFormat: original.format,
      processedWidth: final.width,
      processedHeight: final.height,
      processedFormat: final.format,
      originalBytes: buffer.length,
      processedBytes: processed.length
    }
  };
};

const extractImageText = async (buffer, language, allowEnglishFallback = true) => {
  const tesseractLanguage = languageToTesseract(language);
  let image = { buffer, metadata: { originalBytes: buffer.length, processed: false } };
  let worker;

  try {
    image = await preprocessImageBuffer(buffer);
    image.metadata.processed = true;
  } catch (error) {
    image = {
      buffer,
      metadata: {
        originalBytes: buffer.length,
        processed: false,
        preprocessingError: error.message
      }
    };
  }

  try {
    worker = await createWorker(tesseractLanguage);
  } catch (error) {
    if (allowEnglishFallback && tesseractLanguage !== 'eng') {
      return extractImageText(buffer, 'English', false);
    }
    throw error;
  }

  try {
    const result = await worker.recognize(image.buffer);
    return {
      text: cleanText(result.data?.text || ''),
      confidence: Number(result.data?.confidence || 0) / 100,
      engine: 'tesseract.js',
      preprocessing: image.metadata
    };
  } finally {
    await worker.terminate();
  }
};

const extractTextFromStoredFile = async ({ fileUrl, mimeType, originalFileName, language }) => {
  const filePath = resolveFileUrl(fileUrl);
  const buffer = await fs.promises.readFile(filePath);
  const lowerName = String(originalFileName || filePath).toLowerCase();
  const type = String(mimeType || '').toLowerCase();

  try {
    if (type.includes('pdf') || lowerName.endsWith('.pdf')) {
      const result = await pdfParse(buffer);
      return {
        text: cleanText(result.text || ''),
        confidence: result.text ? 0.86 : 0.2,
        engine: 'pdf-parse'
      };
    }

    if (type.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: cleanText(result.value || ''),
        confidence: result.value ? 0.88 : 0.2,
        engine: 'mammoth'
      };
    }

    if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName)) {
      return extractImageText(buffer, language);
    }

    if (type.includes('text') || lowerName.endsWith('.txt') || lowerName.endsWith('.doc')) {
      const text = cleanText(buffer.toString('utf8'));
      return {
        text,
        confidence: text ? 0.65 : 0.1,
        engine: lowerName.endsWith('.doc') ? 'plain-doc-fallback' : 'plain-text'
      };
    }

    return {
      text: cleanText(buffer.toString('utf8')),
      confidence: 0.35,
      engine: 'binary-text-fallback'
    };
  } catch (error) {
    return {
      text: '',
      confidence: 0,
      engine: 'ocr-error',
      error: error.message
    };
  }
};

const validateExtractedText = (text = '') => {
  const normalized = cleanText(text);
  const words = normalized.split(/\s+/).filter(Boolean);

  return {
    valid: words.length >= 8,
    wordCount: words.length,
    text: normalized,
    reason: words.length >= 8 ? '' : 'OCR text is too short for reliable automatic scoring.'
  };
};

module.exports = {
  cleanText,
  extractTextFromStoredFile,
  preprocessImageBuffer,
  validateExtractedText
};
