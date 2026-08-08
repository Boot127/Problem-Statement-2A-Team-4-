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

function list(req, res, next) {
  try {
    const { search, targetType, status } = req.query;
    const reviews = reviewWorkflowService.listReviews({ search, targetType, status });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

function getById(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const review = reviewWorkflowService.getReviewById(id);
    if (!review) {
      res.status(404).json({ message: 'Review request not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const review = reviewWorkflowService.createReview(req.body || {});
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const review = reviewWorkflowService.updateReview(id, req.body || {});
    if (!review) {
      res.status(404).json({ message: 'Review request not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
}

function transition(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const review = reviewWorkflowService.transitionReview(id, req.body?.status, req.body?.actor);
    if (!review) {
      res.status(404).json({ message: 'Review request not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
}

function comment(req,res,next){try{const id=parseId(req,res);if(id===null)return;const result=reviewWorkflowService.addComment(id,req.body||{});if(!result)return res.status(404).json({message:'Review request not found'});res.status(201).json(result);}catch(err){next(err);}}
function publish(req,res,next){try{const id=parseId(req,res);if(id===null)return;const result=reviewWorkflowService.publishReview(id);if(!result)return res.status(404).json({message:'Review request not found'});res.json(result);}catch(err){next(err);}}
function targets(req,res,next){try{res.json(reviewWorkflowService.listTargets(req.query.type));}catch(err){next(err);}}
function notifications(_req,res,next){try{res.json(reviewWorkflowService.listNotifications());}catch(err){next(err);}}

module.exports = { list, getById, create, update, transition, comment, publish, targets, notifications };
