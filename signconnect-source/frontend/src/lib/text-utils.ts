/**
 * Text normalization and prediction stabilization utilities for SignConnect Sign-to-Text pipeline.
 */

const STANDALONE_SINGLE_LETTER_WORDS = new Set(["A", "I", "a", "i"]);

/**
 * Processes a block of tokens where multi-space delimiters have already been handled.
 */
function processTokenBlock(blockText: string): string {
  const trimmed = blockText.trim();
  if (!trimmed) return "";

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  // Check if any token is already a multi-character word (e.g. "HELLO", "NEED")
  const hasMultiCharTokens = tokens.some((t) => t.length > 1);

  if (!hasMultiCharTokens) {
    // All tokens are single characters (e.g. ["H", "E", "L", "L", "O"] or ["N", "E", "E", "D"])
    // If there is only 1 token and it's single char, return it.
    if (tokens.length === 1) return tokens[0];

    // Check if the entire sequence is just one single standalone letter like "A" or "I"
    // Otherwise, join all single character tokens into one word (e.g. "H E L L O" -> "HELLO")
    return tokens.join("");
  }

  // If there are multi-character tokens mixed with single-character tokens:
  // e.g. ["I", "NEED", "WATER"] or ["HELLO", "I", "NEED"]
  const words: string[] = [];
  let currentCharBuffer: string[] = [];

  const flushCharBuffer = () => {
    if (currentCharBuffer.length > 0) {
      words.push(currentCharBuffer.join(""));
      currentCharBuffer = [];
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.length > 1) {
      flushCharBuffer();
      words.push(token);
    } else {
      // Single character token
      const isStandalone = STANDALONE_SINGLE_LETTER_WORDS.has(token);
      const nextToken = tokens[i + 1];
      const prevToken = tokens[i - 1];

      // It's a standalone word like "A" or "I" if adjacent tokens are multi-char words or boundaries
      const isBoundaryBefore = !prevToken || prevToken.length > 1;
      const isBoundaryAfter = !nextToken || nextToken.length > 1;

      if (isStandalone && isBoundaryBefore && isBoundaryAfter) {
        flushCharBuffer();
        words.push(token);
      } else {
        currentCharBuffer.push(token);
      }
    }
  }
  flushCharBuffer();

  return words.join(" ");
}

/**
 * Normalizes accumulated recognized sign characters/words into a clean natural sentence string.
 * - Collapses multiple spaces and trims leading/trailing whitespace.
 * - Groups single character tokens (e.g. ["H", "E", "L", "L", "O"] or "H E L L O") into natural words ("HELLO").
 * - Preserves valid standalone single-letter words ("A", "I") and real word boundaries.
 * 
 * Example inputs:
 *  - "A" -> "A"
 *  - "H E L L O" -> "HELLO"
 *  - "I NEED WATER" -> "I NEED WATER"
 *  - "H E L L O   I   N E E D   W A T E R" -> "HELLO I NEED WATER"
 *  - "HELLO   I   NEED   WATER" -> "HELLO I NEED WATER"
 *  - " H E L L O " -> "HELLO"
 */
export function normalizeRecognizedText(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // If text contains multi-space separators (2 or more spaces), split into major word blocks
  if (/\s{2,}/.test(trimmed)) {
    const blocks = trimmed.split(/\s{2,}/).filter(Boolean);
    const processedBlocks = blocks.map(processTokenBlock).filter(Boolean);
    return processedBlocks.join(" ");
  }

  // Otherwise, process as a single block
  return processTokenBlock(trimmed);
}

/**
 * Stabilizes consecutive frame predictions by ignoring duplicate consecutive letters
 * received within a specified time window (debounceMs).
 */
export function isDuplicatePrediction(
  lastChar: string,
  lastTime: number,
  newChar: string,
  nowTime: number,
  debounceMs: number = 1000
): boolean {
  if (!lastChar || !newChar) return false;
  if (lastChar.toUpperCase() !== newChar.toUpperCase()) return false;
  return nowTime - lastTime < debounceMs;
}
