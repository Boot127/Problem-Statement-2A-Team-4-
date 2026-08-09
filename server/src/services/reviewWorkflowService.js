const repository = require('../repositories/reviewRepository');
const TARGETS = ['compliance_record', 'work_permit'];
const TRANSITIONS = {
  PENDING: ['IN_REVIEW', 'ARCHIVED'],
  IN_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'ARCHIVED'],
  CHANGES_REQUESTED: ['PENDING', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'], REJECTED: ['ARCHIVED'], ARCHIVED: [],
};
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const trim = (value) => typeof value === 'string' ? value.trim() : '';
function shape(row) {
  if (!row) return null;
  return { id:row.request_id,targetType:row.target_type,targetId:row.target_id,title:row.title,description:row.description||'',reviewStatus:row.review_status,submittedBy:row.submitted_by,reviewedBy:row.reviewed_by,submittedAt:row.submitted_at,reviewedAt:row.reviewed_at,publishedAt:row.published_at,createdAt:row.created_at,updatedAt:row.updated_at };
}
function validate(data, existing) {
  const title=trim(data.title); if (!title) throw new HttpError(400,'Title is required'); if(title.length>200) throw new HttpError(400,'Title must be 200 characters or fewer');
  const description=trim(data.description); if(description.length>2000) throw new HttpError(400,'Description must be 2000 characters or fewer');
  if (existing) return { title, description, updated_at:new Date().toISOString() };
  if(!TARGETS.includes(data.targetType)) throw new HttpError(400,'A valid target type is required');
  const targetId=Number(data.targetId); if(!Number.isInteger(targetId)||targetId<1) throw new HttpError(400,'A valid target id is required');
  if(!repository.findTarget(data.targetType,targetId)) throw new HttpError(422,'The selected target does not exist or is unavailable');
  const now=new Date().toISOString(); return { target_type:data.targetType,target_id:targetId,title,description,review_status:'PENDING',submitted_by:trim(data.submittedBy)||'Compliance Officer',submitted_at:now,created_at:now,updated_at:now };
}
function validateFilters(filters = {}) {
  const search = trim(filters.search);
  const targetType = trim(filters.targetType);
  const status = trim(filters.status);
  if (search.length > 200) throw new HttpError(400, 'Search must be 200 characters or fewer');
  if (targetType && !TARGETS.includes(targetType)) throw new HttpError(400, 'Invalid target type filter');
  if (status && !Object.keys(TRANSITIONS).includes(status)) throw new HttpError(400, 'Invalid review status filter');
  return { search, targetType, status };
}
function parseSnapshot(value) { try { return JSON.parse(value); } catch { return null; } }
function shapeNotification(row) { return { id:row.notification_id,reviewId:row.request_id,message:row.message,isRead:Boolean(row.is_read),createdAt:row.created_at }; }
function listReviews(filters) { return repository.findAll(validateFilters(filters)).map(shape); }
function getReviewById(id) {
  const row=repository.findById(id); if(!row)return null;
  return {...shape(row),target:repository.findTarget(row.target_type,row.target_id),comments:repository.comments(id).map(c=>({id:c.comment_id,author:c.author_name,comment:c.comment,createdAt:c.created_at})),versions:repository.versions(row.target_type,row.target_id).map(v=>({id:v.version_id,version:v.version,publishedAt:v.published_at,reviewId:v.review_id,snapshot:parseSnapshot(v.snapshot)}))};
}
function createReview(data) { const result=shape(repository.insert(validate(data))); repository.notify(result.id,`New review request: ${result.title}`,result.createdAt); return result; }
function updateReview(id,data) { const old=repository.findById(id); if(!old)return null; if(!['PENDING','CHANGES_REQUESTED'].includes(old.review_status)) throw new HttpError(409,'Only Pending or Changes Requested reviews can be edited'); return shape(repository.update(id,validate(data,old))); }
function transitionReview(id,status,actor) { const old=repository.findById(id); if(!old)return null; if(!(TRANSITIONS[old.review_status]||[]).includes(status)) throw new HttpError(409,`Cannot transition from ${old.review_status} to ${status}`); const now=new Date().toISOString(); const result=shape(repository.transition(id,status,trim(actor)||'Compliance Reviewer',now)); repository.notify(id,`${result.title} changed to ${status.replaceAll('_',' ')}`,now); return result; }
function addComment(id,data) { if(!repository.findById(id))return null; const comment=trim(data.comment); if(!comment)throw new HttpError(400,'Comment is required'); if(comment.length>2000)throw new HttpError(400,'Comment must be 2000 characters or fewer'); const now=new Date().toISOString(); const c=repository.addComment(id,trim(data.author)||'Compliance Reviewer',comment,now); repository.notify(id,`New comment on review #${id}`,now); return {id:c.comment_id,author:c.author_name,comment:c.comment,createdAt:c.created_at}; }
function publishReview(id) { const old=repository.findById(id); if(!old)return null; if(old.review_status!=='APPROVED')throw new HttpError(409,'Only an approved review can be published'); if(old.published_at)throw new HttpError(409,'This review has already been published'); const now=new Date().toISOString(); const publication=repository.publish(old,now); if(!publication)throw new HttpError(422,'The review target no longer exists'); repository.notify(id,`${old.title} was published as version ${publication.version}`,now); return {review:getReviewById(id),publication}; }
function listTargets(type){if(!TARGETS.includes(type))throw new HttpError(400,'Invalid target type');return repository.listTargets(type);}
function listNotifications(){return repository.notifications().map(shapeNotification);}
function markNotificationRead(id){if(!repository.findNotification(id))return null;return shapeNotification(repository.markNotificationRead(id));}
function markAllNotificationsRead(){return repository.markAllNotificationsRead().map(shapeNotification);}
module.exports={HttpError,listReviews,getReviewById,createReview,updateReview,transitionReview,addComment,publishReview,listTargets,listNotifications,markNotificationRead,markAllNotificationsRead};
