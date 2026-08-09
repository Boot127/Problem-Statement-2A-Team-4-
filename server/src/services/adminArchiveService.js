const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repository = require('../repositories/adminArchiveRepository');
const auditService = require('./auditService');
const permitUploads = require('../config/uploads');
const { UPLOAD_DIR: RECORD_UPLOAD_DIR } = require('../middleware/upload');

const ENTITY_TYPES = ['COMPLIANCE_CONTENT', 'WORK_PERMIT', 'REVIEW'];
const REVIEW_RESTORE_STATUSES = ['PENDING','IN_REVIEW','APPROVED','CHANGES_REQUESTED','REJECTED'];

function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function requireEntityType(value) {
  const type = String(value || '').toUpperCase();
  if (!ENTITY_TYPES.includes(type)) throw httpError(400, `entityType must be one of: ${ENTITY_TYPES.join(', ')}`);
  return type;
}
function requireId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'A valid archived item id is required');
  return id;
}
function paging(query) {
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const page = Math.max(Number(query.page) || 1, 1);
  return { page, limit, offset: (page - 1) * limit };
}

function shapeCompliance(row) {
  const protectedHistory=Number(row.review_count||0)+Number(row.version_count||0);
  return { id:row.id,title:row.title,countryCode:row.country_code,countryName:row.country_name,type:row.type,status:row.status,previousStatus:row.previous_status,archivedAt:row.archived_at||row.updated_at,attachmentCount:Number(row.attachment_count),componentCount:Number(row.component_count),deleteBlockedReason:protectedHistory?'Permanent deletion is unavailable while review or publication history references this item.':'' };
}
function shapePermit(row) {
  const history=repository.targetHistory('work_permit',Number(row.id));
  return { id:Number(row.id),title:row.title,countryCode:row.country_code,type:row.type,permitHolderName:row.permit_holder_name||'',clientCompanyName:row.client_company_name||'',status:row.status,previousStatus:row.previous_status,archivedAt:row.archived_at||row.updated_at,deleteBlockedReason:history.reviews||history.versions?'Permanent deletion is unavailable while review or publication history references this item.':'' };
}
function shapeReview(row) {
  const versionCount=Number(row.version_count||0);
  return { id:row.id,title:row.title,targetType:row.target_type,targetId:row.target_id,targetTitle:row.target_title||'Target no longer available',status:row.status,previousStatus:row.previous_status,submittedBy:row.submitted_by||'',reviewedBy:row.reviewed_by||'',createdAt:row.created_at,archivedAt:row.archived_at||row.updated_at,commentCount:Number(row.comment_count||0),versionCount,deleteBlockedReason:versionCount?'Permanent deletion is unavailable because this review is part of publication/version history.':'' };
}

async function list(query = {}) {
  const entityType = requireEntityType(query.entityType || 'COMPLIANCE_CONTENT');
  const pageInfo = paging(query);
  const filters = { search:String(query.search||'').trim(),country:String(query.country||'').trim(),type:String(query.type||'').trim(),...pageInfo };
  let result; let filterOptions;
  if (entityType === 'COMPLIANCE_CONTENT') {
    result = repository.listCompliance(filters); filterOptions = repository.complianceFilterOptions();
    result.rows = result.rows.map(shapeCompliance);
  } else if (entityType === 'WORK_PERMIT') {
    result = await repository.listPermits(filters); filterOptions = await repository.permitFilterOptions();
    result.rows = result.rows.map(shapePermit);
  } else {
    result = repository.listReviews(filters); filterOptions = repository.reviewFilterOptions();
    result.rows = result.rows.map(shapeReview);
  }
  return { entityType,items:result.rows,pagination:{page:pageInfo.page,limit:pageInfo.limit,total:result.total,totalPages:Math.ceil(result.total/pageInfo.limit)},counts:await repository.archivedCounts(),filterOptions };
}

function audit(user, action, entityType, id, oldValue, newValue) {
  auditService.log({ userId:user.id,action,entityType:entityType.toLowerCase(),entityId:id,oldValue,newValue });
}
function targetTypeFor(entityType) { return entityType === 'COMPLIANCE_CONTENT' ? 'compliance_record' : 'work_permit'; }
function restoredContentStatus(row, entityType) {
  if (['DRAFT','PUBLISHED'].includes(row.previous_status)) return row.previous_status;
  return repository.targetHistory(targetTypeFor(entityType), entityType === 'COMPLIANCE_CONTENT' ? row.record_id : row.permit_id).versions > 0 ? 'PUBLISHED' : 'DRAFT';
}

async function restore(entityTypeValue, idValue, user) {
  const entityType=requireEntityType(entityTypeValue); const id=requireId(idValue); const now=new Date().toISOString();
  if (entityType === 'COMPLIANCE_CONTENT') {
    const row=repository.findCompliance(id); if(!row)throw httpError(404,'Archived compliance content not found');
    const status=restoredContentStatus(row,entityType);
    return repository.sharedTransaction(()=>{const restored=repository.restoreCompliance(id,status,user.id,now);audit(user,'RESTORE_ARCHIVED',entityType,id,{status:'ARCHIVED'},{status});return {id,title:restored.title,status};});
  }
  if (entityType === 'WORK_PERMIT') {
    const row=await repository.findPermit(id); if(!row)throw httpError(404,'Archived work permit not found');
    const status=restoredContentStatus(row,entityType);
    const restored=await repository.permitTransaction(()=>repository.restorePermit(id,status,now));
    audit(user,'RESTORE_ARCHIVED',entityType,id,{status:'ARCHIVED'},{status});
    return {id,title:restored.title,status};
  }
  const row=repository.findReview(id); if(!row)throw httpError(404,'Archived review request not found');
  const status=REVIEW_RESTORE_STATUSES.includes(row.previous_status)?row.previous_status:'PENDING';
  return repository.sharedTransaction(()=>{const restored=repository.restoreReview(id,status,now);audit(user,'RESTORE_ARCHIVED',entityType,id,{status:'ARCHIVED'},{status});return {id,title:restored.title,status,usedFallback:!row.previous_status};});
}

function safeRecordFile(filePath) {
  const resolved=path.resolve(RECORD_UPLOAD_DIR,path.basename(String(filePath||'')));
  if(!resolved.startsWith(path.resolve(RECORD_UPLOAD_DIR)+path.sep))throw httpError(500,'An attachment path is outside the managed upload directory');
  return resolved;
}
function stageFiles(paths) {
  const staged=[];
  try {
    for(const original of [...new Set(paths)]){
      if(!fs.existsSync(original))continue;
      const temporary=`${original}.admin-delete-${crypto.randomUUID()}`;
      fs.renameSync(original,temporary); staged.push({original,temporary});
    }
    return staged;
  } catch(error){for(const item of staged.reverse()){try{fs.renameSync(item.temporary,item.original);}catch{}}throw error;}
}
function restoreStaged(staged){for(const item of [...staged].reverse()){try{if(fs.existsSync(item.temporary))fs.renameSync(item.temporary,item.original);}catch{}}}
function finishStaged(staged){for(const item of staged){try{fs.unlinkSync(item.temporary);}catch{}}}
function assertNoTargetHistory(entityType,id){const history=repository.targetHistory(targetTypeFor(entityType),id);if(history.reviews||history.versions)throw httpError(409,'Permanent deletion is unavailable while review or publication history references this item.');}

async function permanentlyDelete(entityTypeValue,idValue,user) {
  const entityType=requireEntityType(entityTypeValue); const id=requireId(idValue);
  if(entityType==='COMPLIANCE_CONTENT'){
    const row=repository.findCompliance(id);if(!row)throw httpError(404,'Archived compliance content not found');assertNoTargetHistory(entityType,id);
    const staged=stageFiles(repository.complianceAttachments(id).map(item=>safeRecordFile(item.file_path)));
    try{repository.sharedTransaction(()=>{if(!repository.deleteCompliance(id))throw httpError(409,'Compliance content is no longer archived');audit(user,'PERMANENT_DELETE',entityType,id,{title:row.title,status:'ARCHIVED'},{deleted:true});});finishStaged(staged);return {id,title:row.title,deleted:true};}catch(error){restoreStaged(staged);throw error;}
  }
  if(entityType==='WORK_PERMIT'){
    const row=await repository.findPermit(id);if(!row)throw httpError(404,'Archived work permit not found');assertNoTargetHistory(entityType,id);
    const sources=await repository.permitSourceDocuments(id);const staged=stageFiles(sources.map(item=>permitUploads.storedFilePath(item.stored_file_name)));
    try{await repository.permitTransaction(async()=>{if(!await repository.deletePermit(id))throw httpError(409,'Work permit is no longer archived');});audit(user,'PERMANENT_DELETE',entityType,id,{title:row.title,status:'ARCHIVED'},{deleted:true});finishStaged(staged);return {id,title:row.title,deleted:true};}catch(error){restoreStaged(staged);throw error;}
  }
  const row=repository.findReview(id);if(!row)throw httpError(404,'Archived review request not found');
  if(repository.reviewVersionCount(id)>0)throw httpError(409,'Permanent deletion is unavailable because this review is part of publication/version history.');
  return repository.sharedTransaction(()=>{if(!repository.deleteReview(id))throw httpError(409,'Review request is no longer archived');audit(user,'PERMANENT_DELETE',entityType,id,{title:row.title,status:'ARCHIVED'},{deleted:true});return {id,title:row.title,deleted:true};});
}

module.exports={ENTITY_TYPES,list,restore,permanentlyDelete};
