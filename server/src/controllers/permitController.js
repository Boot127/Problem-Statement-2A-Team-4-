// Dev 2 — work_permits request handlers (mirrors permitRoutes.js)

const workPermitService = require('../services/workPermitService');

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid permit id' });
    return null;
  }
  return id;
}

async function list(req, res, next) {
  try {
    const {
      search,
      country,
      status,
      reviewState,
      workerType,
      visibility,
      hasSource,
      hasRenewal,
      hasCancellation,
      processCompleteness,
      minFee,
      maxFee,
      minProcessingDays,
      maxProcessingDays,
      nextReviewFrom,
      nextReviewTo,
      page,
      limit,
    } = req.query;
    res.json(
      await workPermitService.listPermits({
        search,
        country,
        status,
        reviewState,
        workerType,
        visibility,
        hasSource,
        hasRenewal,
        hasCancellation,
        processCompleteness,
        minFee,
        maxFee,
        minProcessingDays,
        maxProcessingDays,
        nextReviewFrom,
        nextReviewTo,
        page,
        limit,
      })
    );
  } catch (err) {
    next(err);
  }
}

// Aggregate information-health figures for the dashboard warnings.
async function healthSummary(req, res, next) {
  try {
    res.json(await workPermitService.getHealthSummary());
  } catch (err) {
    next(err);
  }
}

async function reminders(req, res, next) {
  try {
    res.json(await workPermitService.getReminders({ type: req.query.type }));
  } catch (err) {
    next(err);
  }
}

// Advisory duplicate check used by the create/edit form before saving.
// Always 200 — an empty array simply means no collision.
async function duplicates(req, res, next) {
  try {
    const { countryCode, permitType, excludeId } = req.query;
    res.json(await workPermitService.findDuplicates({ countryCode, permitType, excludeId }));
  } catch (err) {
    next(err);
  }
}

async function recordReview(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = await workPermitService.recordReview(id, req.body || {});
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = await workPermitService.getPermitById(id);
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const permit = await workPermitService.createPermit(req.body || {});
    res.status(201).json(permit);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = await workPermitService.updatePermit(id, req.body || {});
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

async function archive(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = await workPermitService.archivePermit(id);
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  healthSummary,
  reminders,
  duplicates,
  recordReview,
  create,
  update,
  archive,
};
