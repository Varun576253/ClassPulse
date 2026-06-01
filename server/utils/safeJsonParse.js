const stripMarkdownBackticks = (value = '') => value
  .replace(/```json/gi, '')
  .replace(/```/g, '')
  .trim();

const extractJsonText = (value = '') => {
  const cleaned = stripMarkdownBackticks(value);
  const arrayStart = cleaned.indexOf('[');
  const objectStart = cleaned.indexOf('{');
  const starts = [arrayStart, objectStart].filter((index) => index >= 0);

  if (!starts.length) {
    return cleaned;
  }

  const start = Math.min(...starts);
  const wantsArray = cleaned[start] === '[';
  const end = cleaned.lastIndexOf(wantsArray ? ']' : '}');
  return end > start ? cleaned.slice(start, end + 1) : cleaned.slice(start);
};

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(extractJsonText(value));
  } catch (error) {
    console.error('[json] Gemini JSON parse failed:', error.message);
    return fallback;
  }
};

module.exports = {
  safeJsonParse,
  stripMarkdownBackticks
};
