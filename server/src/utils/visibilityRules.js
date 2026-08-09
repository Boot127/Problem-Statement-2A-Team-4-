// Shared cross-cutting rule (Section 15): which visibility_level values a
// role may see. COMPLIANCE_ONLY is the most sensitive; CLIENT_SHAREABLE the
// least. Admin can view COMPLIANCE_ONLY per the Role/Permission Summary
// (Section 4.5: "See COMPLIANCE_ONLY content | Admin: (view)").
const VISIBILITY_BY_ROLE = {
  compliance: ['COMPLIANCE_ONLY', 'INTERNAL_STAFF', 'CLIENT_SHAREABLE'],
  admin: ['COMPLIANCE_ONLY', 'INTERNAL_STAFF', 'CLIENT_SHAREABLE'],
  sales: ['INTERNAL_STAFF', 'CLIENT_SHAREABLE'],
  customer_service: ['INTERNAL_STAFF', 'CLIENT_SHAREABLE'],
};

function allowedVisibilityFor(role) {
  return VISIBILITY_BY_ROLE[role] || ['CLIENT_SHAREABLE'];
}

module.exports = { allowedVisibilityFor };
