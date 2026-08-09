// Shared — cross-entity keyword search + filters (Section 11 / FR-0.7).
// Owned by Developer 1 (see HLD Section 5) — no other developer had claimed
// it, and it builds directly on the `/records` visibility-filtering work
// already done for Compliance Content.
//
// Rather than duplicating each feature's filtering SQL here, this calls into
// their own service layer (complianceContentService, workPermitService) and
// normalizes the results into one shape. Reviews and newsletters aren't
// "browsable content" in the same sense (they're workflow objects without
// their own visibility level) and aren't included — extending this to them
// later is a matter of adding another normalize+fetch branch below.

const complianceContentService = require('./complianceContentService');
const workPermitService = require('./workPermitService');
const { allowedVisibilityFor } = require('../utils/visibilityRules');

// NFR-2: list endpoints are paginated and never return unbounded result
// sets. Search fetches up to this many candidates per entity type, combines
// them, then paginates the combined set — same bounded-search compromise
// used by the CSV export in the client.
const MAX_CANDIDATES = 100;

function normalizeRecord(record) {
  return {
    type: 'compliance_record',
    id: record.id,
    title: record.title,
    snippet: record.summary || '',
    countryCode: record.countryCode,
    category: record.category,
    workerType: record.workerType,
    visibility: record.visibility,
    status: record.status,
    href: `/content/${record.id}`,
  };
}

function normalizePermit(permit) {
  return {
    type: 'work_permit',
    id: permit.id,
    title: permit.title,
    snippet: permit.description || permit.permitType || '',
    countryCode: permit.countryCode,
    category: permit.permitType,
    workerType: permit.workerType,
    visibility: permit.visibility,
    status: permit.status,
    href: `/permits/${permit.id}`,
  };
}

async function fetchRecords(query, user) {
  // complianceContentService.list() already enforces visibility server-side.
  const { data } = await complianceContentService.list(
    {
      search: query.search,
      country: query.country,
      category: query.category,
      workerType: query.workerType,
      status: query.status,
      page: 1,
      limit: MAX_CANDIDATES,
    },
    user
  );
  return data.map(normalizeRecord);
}

async function fetchPermits(query, user) {
  // work_permits' own /permits endpoint doesn't enforce visibility (no auth
  // is applied to permitRoutes.js), so Search applies the same shared rule
  // itself, post-query, rather than silently leaking COMPLIANCE_ONLY permits
  // into a Sales/Customer Service search result.
  const allowedVisibility = allowedVisibilityFor(user.role);
  const { items } = await workPermitService.listPermits({
    search: query.search,
    country: query.country,
    workerType: query.workerType,
    status: query.status,
    limit: MAX_CANDIDATES,
  });
  return items.filter((p) => allowedVisibility.includes(p.visibility)).map(normalizePermit);
}

async function search(query, user) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), MAX_CANDIDATES);
  const wantType = query.type; // 'compliance_record' | 'work_permit' | undefined (both)

  const [records, permits] = await Promise.all([
    !wantType || wantType === 'compliance_record' ? fetchRecords(query, user) : [],
    !wantType || wantType === 'work_permit' ? fetchPermits(query, user) : [],
  ]);

  const results = [...records, ...permits].sort((a, b) => a.title.localeCompare(b.title));
  const total = results.length;
  const start = (page - 1) * limit;

  return {
    data: results.slice(start, start + limit),
    pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    counts: {
      compliance_record: records.length,
      work_permit: permits.length,
    },
  };
}

module.exports = { search };
