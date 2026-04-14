import * as pdfjsLib from 'pdfjs-dist';
import type { VerificationResult } from './types';

// Use Vite's ?url import to bundle the worker correctly for local and GitHub Pages deployment
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const INCOME_THRESHOLD = 150_000;

/**
 * Patterns used to identify income fields in the PDF text, checked in priority order.
 *
 * Priority order rationale:
 * - AGI / Adjusted Gross Income is the most authoritative income figure in tax documents
 * - "Total Income" and "Net Income" are explicit income fields in financial statements
 * - "Gross Income" and "Taxable Income" are common secondary fields
 * - "Annual Income" covers general-purpose income reports
 *
 * Fields like "Gross Receipts", "Net Profit", "Revenue", and "Operating Expenses"
 * are intentionally excluded — they do not unambiguously represent personal income.
 */
const INCOME_PATTERNS = [
  /adjusted gross income/i,
  /\bagi\b/i,
  /total income/i,
  /net income/i,
  /gross income/i,
  /taxable income/i,
  /annual income/i,
];

type RawTextItem = { str: string; transform: number[] };

/** Parse the first dollar amount found in a string. Returns null if none found. */
function parseDollar(text: string): number | null {
  const match = text.match(/\$[\d,]+(?:\.\d{1,2})?/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(/[$,]/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Groups pdfjs text items into lines by their vertical (Y) position.
 * Items with the same Y coordinate (within ±2pt) are treated as the same line,
 * sorted left-to-right by X coordinate.
 */
function groupIntoLines(items: RawTextItem[]): string[] {
  if (items.length === 0) return [];

  // Sort top-to-bottom, then left-to-right within a line
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5]! - a.transform[5]!;
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.transform[4]! - b.transform[4]!;
  });

  const lines: string[] = [];
  let currentLine = sorted[0]!.str;
  let currentY = sorted[0]!.transform[5]!;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]!;
    const y = item.transform[5]!;
    if (Math.abs(y - currentY) > 2) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = item.str;
      currentY = y;
    } else {
      currentLine += (currentLine && item.str ? ' ' : '') + item.str;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}

/**
 * Parses a PDF file and determines whether the income figure found exceeds $150,000.
 *
 * Returns:
 *   - "verified"            — income found and > $150,000
 *   - "not_verified"        — income found and ≤ $150,000
 *   - "unable_to_determine" — no clearly labelled income field found
 */
export async function verifyIncome(file: File): Promise<VerificationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const textItems = content.items.filter(
      (item): item is RawTextItem => 'str' in item,
    );
    allLines.push(...groupIntoLines(textItems));
  }

  for (const pattern of INCOME_PATTERNS) {
    for (const line of allLines) {
      if (pattern.test(line)) {
        const amount = parseDollar(line);
        if (amount !== null) {
          return {
            status: amount > INCOME_THRESHOLD ? 'verified' : 'not_verified',
            value: amount,
            label: line,
          };
        }
      }
    }
  }

  return { status: 'unable_to_determine', value: null, label: null };
}
