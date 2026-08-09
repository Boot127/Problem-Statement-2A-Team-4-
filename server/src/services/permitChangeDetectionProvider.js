const { createPermitExtractionProvider, PROCESS_TYPES, SCALAR_FIELDS } = require('./permitExtractionProvider');

const FIELD_LABELS = {
  countryCode: 'Country',
  permitType: 'Permit type',
  title: 'Title',
  description: 'Description',
  eligibilityCriteria: 'Eligibility',
  processingTimeDays: 'Processing time',
  validityMonths: 'Validity',
  governmentFee: 'Government fee',
  currencyCode: 'Currency',
  workerType: 'Worker type',
};

function comparable(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function tokenSimilarity(left, right) {
  const a = new Set(comparable(left).split(/[^a-z0-9]+/).filter(Boolean));
  const b = new Set(comparable(right).split(/[^a-z0-9]+/).filter(Boolean));
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((token) => b.has(token)).length;
  return common / Math.max(a.size, b.size);
}

function evidenceSnippet(text, needle) {
  const source = String(text || '');
  const query = String(needle || '').trim();
  if (!query) return '';
  const index = source.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return '';
  const start = Math.max(0, index - 90);
  const end = Math.min(source.length, index + query.length + 150);
  return source.slice(start, end).replace(/\s+/g, ' ').trim();
}

function processMentioned(text, processType) {
  const patterns = {
    NEW: /\b(new application|initial application|application process)\b/i,
    RENEWAL: /\b(renewal|renew|extension)\b/i,
    CANCELLATION: /\b(cancellation|cancel(?:lation)?|termination)\b/i,
  };
  return patterns[processType].test(text);
}

function makeChange({ kind, changeType, label, field = null, processType = null, currentId = null, current = null, proposed = null, text = '' }) {
  const evidenceValue = typeof proposed === 'object'
    ? proposed?.stepTitle || proposed?.documentName || proposed?.expectedTimeline || proposed?.notes
    : proposed;
  return {
    id: `${kind}-${processType || 'PERMIT'}-${currentId || 'new'}-${label}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
    kind,
    changeType,
    label,
    field,
    processType,
    currentId,
    current,
    proposed,
    evidenceSnippet: evidenceSnippet(text, evidenceValue),
  };
}

function compareFields(text, permit, extracted) {
  return SCALAR_FIELDS.flatMap((field) => {
    const proposed = extracted.fields?.[field]?.value;
    if (proposed === null || proposed === undefined || proposed === '') return [];
    const current = permit[field] ?? null;
    return [makeChange({
      kind: 'PERMIT_FIELD',
      changeType: comparable(current) === comparable(proposed) ? 'UNCHANGED' : 'CHANGED',
      label: FIELD_LABELS[field] || field,
      field,
      current,
      proposed,
      text,
    })];
  });
}

function bestMatch(sourceItem, available, titleKey, orderKey) {
  const exact = available.find((item) => comparable(item[titleKey]) === comparable(sourceItem[titleKey]));
  if (exact) return exact;
  const ranked = available
    .map((item) => ({ item, score: tokenSimilarity(item[titleKey], sourceItem[titleKey]) }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score >= 0.45) return ranked[0].item;
  return available.find((item) => Number(item[orderKey]) === Number(sourceItem[orderKey])) || null;
}

function compareItems({ text, processType, currentItems, sourceItems, kind, titleKey, orderKey, valueKeys }) {
  const available = [...currentItems];
  const changes = [];
  sourceItems.forEach((sourceItem) => {
    const match = bestMatch(sourceItem, available, titleKey, orderKey);
    if (!match) {
      changes.push(makeChange({ kind, changeType: 'ADDED', label: sourceItem[titleKey], processType, proposed: sourceItem, text }));
      return;
    }
    available.splice(available.indexOf(match), 1);
    const unchanged = valueKeys.every((key) => comparable(match[key]) === comparable(sourceItem[key]));
    changes.push(makeChange({
      kind,
      changeType: unchanged ? 'UNCHANGED' : 'CHANGED',
      label: sourceItem[titleKey],
      processType,
      currentId: match.id,
      current: match,
      proposed: sourceItem,
      text,
    }));
  });
  available.forEach((item) => changes.push(makeChange({
    kind,
    changeType: 'REMOVED',
    label: item[titleKey],
    processType,
    currentId: item.id,
    current: item,
    proposed: null,
    text,
  })));
  return changes;
}

function deterministicComparison(text, currentPermit, extracted) {
  const changes = compareFields(text, currentPermit, extracted);
  for (const processType of PROCESS_TYPES) {
    if (!processMentioned(text, processType)) continue;
    changes.push(...compareItems({
      text,
      processType,
      currentItems: currentPermit.steps?.[processType] || [],
      sourceItems: extracted.processes?.[processType]?.steps || [],
      kind: 'STEP',
      titleKey: 'stepTitle',
      orderKey: 'stepNumber',
      valueKeys: ['stepNumber', 'stepTitle', 'stepDetail', 'expectedTimeline'],
    }));
    changes.push(...compareItems({
      text,
      processType,
      currentItems: currentPermit.documents?.[processType] || [],
      sourceItems: extracted.processes?.[processType]?.documents || [],
      kind: 'DOCUMENT',
      titleKey: 'documentName',
      orderKey: 'sortOrder',
      valueKeys: ['sortOrder', 'documentName', 'isMandatory', 'notes'],
    }));
  }
  return {
    changes,
    possibleChangeCount: changes.filter((change) => change.changeType !== 'UNCHANGED').length,
    unchangedCount: changes.filter((change) => change.changeType === 'UNCHANGED').length,
  };
}

function createPermitChangeDetectionProvider({ extractionProvider } = {}) {
  const provider = extractionProvider || createPermitExtractionProvider();
  return {
    mode: provider.mode,
    async compare(text, currentPermit) {
      const extracted = await provider.extract(text, currentPermit);
      return deterministicComparison(text, currentPermit, extracted);
    },
  };
}

module.exports = { comparable, deterministicComparison, createPermitChangeDetectionProvider };
