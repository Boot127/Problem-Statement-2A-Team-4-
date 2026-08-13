// Single source of truth for the SQLite -> PostgreSQL data transfer and its
// verification. Tables are ordered so every referenced parent is imported
// before its children. Audit logs are last because entity_id is polymorphic.

const TABLES = [
  {
    name: 'countries', primaryKey: ['country_id'], identity: 'country_id', booleanColumns: ['is_active'],
    columns: ['country_id','country_code','country_name','region','currency_code','is_active','created_at','updated_at'],
    timestampColumns: ['created_at','updated_at'],
  },
  {
    name: 'users', primaryKey: ['user_id'], identity: 'user_id', booleanColumns: ['is_active'],
    sensitiveColumns: ['password_hash'],
    columns: ['user_id','full_name','email','password_hash','role','is_active','failed_attempts','last_login_at','created_at','updated_at'],
    timestampColumns: ['last_login_at','created_at','updated_at'],
  },
  {
    name: 'compliance_records', primaryKey: ['record_id'], identity: 'record_id', booleanColumns: [],
    columns: ['record_id','country_id','category','title','summary','full_text','worker_type','visibility','effective_date','source_url','version','status','previous_status','archived_at','created_by','updated_by','created_at','updated_at'],
    dateColumns: ['effective_date'], timestampColumns: ['archived_at','created_at','updated_at'],
  },
  {
    name: 'work_permits', primaryKey: ['permit_id'], identity: 'permit_id', booleanColumns: [],
    columns: ['permit_id','country_code','permit_type','title','permit_holder_name','client_company_name','description','eligibility_criteria','processing_time_days','validity_months','government_fee','currency_code','worker_type','visibility','source_url','version','status','previous_status','archived_at','last_reviewed_at','next_review_at','review_notes','information_status','created_at','updated_at'],
    dateColumns: ['last_reviewed_at','next_review_at'], timestampColumns: ['archived_at','created_at','updated_at'],
  },
  {
    name: 'review_requests', primaryKey: ['request_id'], identity: 'request_id', booleanColumns: [],
    columns: ['request_id','target_type','target_id','title','description','review_status','previous_status','archived_at','submitted_by','reviewed_by','submitted_at','reviewed_at','published_at','created_at','updated_at'],
    timestampColumns: ['archived_at','submitted_at','reviewed_at','published_at','created_at','updated_at'],
  },
  {
    name: 'newsletters', primaryKey: ['id'], identity: 'id', booleanColumns: ['is_deleted'],
    columns: ['id','title','country','source','published_date','status','notes','file_name','file_path','is_deleted','created_at','updated_at'],
    dateColumns: ['published_date'], timestampColumns: ['created_at','updated_at'],
  },
  {
    name: 'benefit_components', primaryKey: ['component_id'], identity: 'component_id', booleanColumns: [],
    columns: ['component_id','record_id','component_name','worker_type','employer_rate','employee_rate','cap_ceiling','calculation_basis','notes','sort_order'],
  },
  {
    name: 'record_attachments', primaryKey: ['attachment_id'], identity: 'attachment_id', booleanColumns: [],
    columns: ['attachment_id','record_id','file_name','file_path','file_type','uploaded_by','uploaded_at'],
    timestampColumns: ['uploaded_at'],
  },
  {
    name: 'work_permit_steps', primaryKey: ['step_id'], identity: 'step_id', booleanColumns: [],
    columns: ['step_id','permit_id','process_type','step_number','step_title','step_detail','expected_timeline'],
  },
  {
    name: 'permit_documents', primaryKey: ['document_id'], identity: 'document_id', booleanColumns: ['is_mandatory'],
    columns: ['document_id','permit_id','process_type','document_name','is_mandatory','notes','sort_order'],
  },
  {
    name: 'permit_source_documents', primaryKey: ['source_document_id'], identity: 'source_document_id', booleanColumns: [],
    columns: ['source_document_id','permit_id','original_file_name','stored_file_name','mime_type','file_size','file_hash','description','source_type','status','uploaded_by','uploaded_at'],
    timestampColumns: ['uploaded_at'],
  },
  {
    name: 'permit_groups', primaryKey: ['group_id'], identity: 'group_id', booleanColumns: [],
    columns: ['group_id','group_name','description','status','created_at','updated_at'],
    timestampColumns: ['created_at','updated_at'],
  },
  {
    name: 'permit_group_members', primaryKey: ['group_id','permit_id'], identity: null, booleanColumns: [],
    columns: ['group_id','permit_id','added_at'], timestampColumns: ['added_at'],
  },
  {
    name: 'review_comments', primaryKey: ['comment_id'], identity: 'comment_id', booleanColumns: [],
    columns: ['comment_id','request_id','author_name','comment','created_at'], timestampColumns: ['created_at'],
  },
  {
    name: 'notifications', primaryKey: ['notification_id'], identity: 'notification_id', booleanColumns: ['is_read'],
    columns: ['notification_id','request_id','recipient','message','is_read','created_at'], timestampColumns: ['created_at'],
  },
  {
    name: 'record_versions', primaryKey: ['version_id'], identity: 'version_id', booleanColumns: [],
    sensitiveColumns: ['snapshot'],
    columns: ['version_id','target_type','target_id','version','snapshot','published_at','review_id'], timestampColumns: ['published_at'],
  },
  {
    name: 'detected_updates', primaryKey: ['id'], identity: 'id', booleanColumns: ['ai_flagged'],
    columns: ['id','newsletter_id','ai_summary','ai_flagged','ai_flag_reason','review_decision','linked_compliance_area','reviewed_at','created_at','updated_at'],
    timestampColumns: ['reviewed_at','created_at','updated_at'],
  },
  {
    name: 'audit_logs', primaryKey: ['log_id'], identity: 'log_id', booleanColumns: [],
    sensitiveColumns: ['old_value','new_value'],
    columns: ['log_id','user_id','action','admin_action','entity_type','entity_id','old_value','new_value','created_at'],
    timestampColumns: ['created_at'],
  },
].map((table) => ({
  dateColumns: [], timestampColumns: [], sensitiveColumns: [], ...table,
}));

const RELATIONSHIPS = [
  ['compliance_records.country_id', 'compliance_records c LEFT JOIN countries p ON p.country_id=c.country_id', 'p.country_id IS NULL'],
  ['compliance_records.created_by', 'compliance_records c LEFT JOIN users p ON p.user_id=c.created_by', 'c.created_by IS NOT NULL AND p.user_id IS NULL'],
  ['compliance_records.updated_by', 'compliance_records c LEFT JOIN users p ON p.user_id=c.updated_by', 'c.updated_by IS NOT NULL AND p.user_id IS NULL'],
  ['benefit_components.record_id', 'benefit_components c LEFT JOIN compliance_records p ON p.record_id=c.record_id', 'p.record_id IS NULL'],
  ['record_attachments.record_id', 'record_attachments c LEFT JOIN compliance_records p ON p.record_id=c.record_id', 'p.record_id IS NULL'],
  ['record_attachments.uploaded_by', 'record_attachments c LEFT JOIN users p ON p.user_id=c.uploaded_by', 'c.uploaded_by IS NOT NULL AND p.user_id IS NULL'],
  ['work_permit_steps.permit_id', 'work_permit_steps c LEFT JOIN work_permits p ON p.permit_id=c.permit_id', 'p.permit_id IS NULL'],
  ['permit_documents.permit_id', 'permit_documents c LEFT JOIN work_permits p ON p.permit_id=c.permit_id', 'p.permit_id IS NULL'],
  ['permit_source_documents.permit_id', 'permit_source_documents c LEFT JOIN work_permits p ON p.permit_id=c.permit_id', 'p.permit_id IS NULL'],
  ['permit_group_members.group_id', 'permit_group_members c LEFT JOIN permit_groups p ON p.group_id=c.group_id', 'p.group_id IS NULL'],
  ['permit_group_members.permit_id', 'permit_group_members c LEFT JOIN work_permits p ON p.permit_id=c.permit_id', 'p.permit_id IS NULL'],
  ['review_comments.request_id', 'review_comments c LEFT JOIN review_requests p ON p.request_id=c.request_id', 'p.request_id IS NULL'],
  ['notifications.request_id', 'notifications c LEFT JOIN review_requests p ON p.request_id=c.request_id', 'c.request_id IS NOT NULL AND p.request_id IS NULL'],
  ['record_versions.review_id', 'record_versions c LEFT JOIN review_requests p ON p.request_id=c.review_id', 'p.request_id IS NULL'],
  ['detected_updates.newsletter_id', 'detected_updates c LEFT JOIN newsletters p ON p.id=c.newsletter_id', 'p.id IS NULL'],
  ['audit_logs.user_id', 'audit_logs c LEFT JOIN users p ON p.user_id=c.user_id', 'c.user_id IS NOT NULL AND p.user_id IS NULL'],
];

module.exports = { TABLES, RELATIONSHIPS };
