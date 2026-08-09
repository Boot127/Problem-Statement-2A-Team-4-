// Extracts plain text from an already-validated Work Permit source document.
// Upload validation remains the authority for accepted file types; this layer
// only reads a server-owned path returned by permitSourceDocumentService.

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { ValidationError } = require('../utils/errors');

const MAX_EXTRACTED_CHARACTERS = 120_000;

function normaliseText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

async function extractDocumentText(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  let rawText;
  try {
    if (mimeType === 'application/pdf' || path.extname(filePath).toLowerCase() === '.pdf') {
      rawText = (await pdfParse(buffer)).text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      path.extname(filePath).toLowerCase() === '.docx'
    ) {
      rawText = (await mammoth.extractRawText({ buffer })).value;
    } else {
      throw new ValidationError('Only uploaded PDF or DOCX source documents can be extracted');
    }
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(`This document could not be read: ${error.message}`);
  }

  const text = normaliseText(rawText);
  if (!text) throw new ValidationError('No readable text was found in this document');
  return { text, truncated: String(rawText || '').length > MAX_EXTRACTED_CHARACTERS };
}

module.exports = { MAX_EXTRACTED_CHARACTERS, normaliseText, extractDocumentText };
