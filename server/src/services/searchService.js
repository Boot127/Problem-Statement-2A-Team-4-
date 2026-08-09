// Shared — cross-entity keyword search + filters (Section 11 / FR-0.7).
//
// The HLD scopes this across all four features' content entities. Only
// compliance_records exists in this build (work_permits, review_requests,
// and newsletters/detected_updates are the other three developers' tables),
// so this currently searches compliance_records alone. Extending it once
// those tables exist is a matter of UNIONing in their own repositories.

const complianceContentService = require('./complianceContentService');

function search(query, user) {
  const { data, pagination } = complianceContentService.list(query, user);
  return {
    data: data.map((record) => ({ type: 'compliance_record', ...record })),
    pagination,
  };
}

module.exports = { search };
