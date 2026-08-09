// Dev 3 — review_requests request handlers (mirrors reviewRoutes.js)

const reviewWorkflowService = require('../services/reviewWorkflowService');

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid review request id' });
    return null;
  }
  return id;
}

async function list(req, res, next) {
  try {
    const { search, targetType, status } = req.query;
    const reviews = await reviewWorkflowService.listReviews({ search, targetType, status });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const review = await reviewWorkflowService.getReviewById(id);
    if (!review) {
      res.status(404).json({ message: 'Review request not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const review = await reviewWorkflowService.createReview(req.body || {});
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const review = await reviewWorkflowService.updateReview(id, req.body || {});
    if (!review) {
      res.status(404).json({ message: 'Review request not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
}

async function transition(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const review = await reviewWorkflowService.transitionReview(id, req.body?.status, req.body?.actor);
    if (!review) {
      res.status(404).json({ message: 'Review request not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
}

async function comment(req,res,next){try{const id=parseId(req,res);if(id===null)return;const result=await reviewWorkflowService.addComment(id,req.body||{});if(!result)return res.status(404).json({message:'Review request not found'});res.status(201).json(result);}catch(err){next(err);}}
async function publish(req,res,next){try{const id=parseId(req,res);if(id===null)return;const result=await reviewWorkflowService.publishReview(id);if(!result)return res.status(404).json({message:'Review request not found'});res.json(result);}catch(err){next(err);}}
async function targets(req,res,next){try{res.json(await reviewWorkflowService.listTargets(req.query.type));}catch(err){next(err);}}
async function notifications(_req,res,next){try{res.json(await reviewWorkflowService.listNotifications());}catch(err){next(err);}}
async function markNotificationRead(req,res,next){try{const id=Number(req.params.notificationId);if(!Number.isInteger(id)||id<=0)return res.status(400).json({message:'Invalid notification id'});const result=await reviewWorkflowService.markNotificationRead(id);if(!result)return res.status(404).json({message:'Notification not found'});res.json(result);}catch(err){next(err);}}
async function markAllNotificationsRead(_req,res,next){try{res.json(await reviewWorkflowService.markAllNotificationsRead());}catch(err){next(err);}}

module.exports = { list, getById, create, update, transition, comment, publish, targets, notifications, markNotificationRead, markAllNotificationsRead };
