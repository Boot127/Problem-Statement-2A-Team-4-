function hasText(value) {
  return Boolean(String(value || '').trim());
}

export function calculateTemplateCompleteness(steps = [], documents = []) {
  const checks = [
    { label: 'Add at least one process step', done: steps.length > 0 },
    { label: 'Add at least one checklist document', done: documents.length > 0 },
  ];

  steps.forEach((step, index) => {
    const label = step.stepTitle || `Step ${index + 1}`;
    checks.push(
      { label: `${label}: add a title`, done: hasText(step.stepTitle) },
      { label: `${label}: add instructions`, done: hasText(step.stepDetail) },
      { label: `${label}: add an expected timeline`, done: hasText(step.expectedTimeline) },
    );
  });

  documents.forEach((document, index) => {
    const label = document.documentName || `Document ${index + 1}`;
    checks.push(
      { label: `${label}: add a document name`, done: hasText(document.documentName) },
      { label: `${label}: add checklist notes`, done: hasText(document.notes) },
    );
  });

  const completed = checks.filter((check) => check.done).length;
  return {
    percentage: checks.length ? Math.round((completed / checks.length) * 100) : 0,
    completed,
    total: checks.length,
    missing: checks.filter((check) => !check.done).map((check) => check.label),
  };
}
