// Dev 4 — newsletters + detected_updates request handlers (mirrors
// newsletterRoutes.js). Thin: validation/orchestration lives in
// newsletterUpdateService.js.

const newsletterUpdateService = require('../services/newsletterUpdateService');

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid newsletter id' });
    return null;
  }
  return id;
}

async function list(req, res, next) {
  try {
    const newsletters = await newsletterUpdateService.list(req.query);
    res.json(newsletters);
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const newsletter = await newsletterUpdateService.getById(id);
    if (!newsletter) {
      return res.status(404).json({ message: 'Newsletter not found.' });
    }
    res.json(newsletter);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const newsletter = await newsletterUpdateService.create(req.body);
    res.status(201).json(newsletter);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message, errors: error.details });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const newsletter = await newsletterUpdateService.update(id, req.body);
    if (!newsletter) {
      return res.status(404).json({ message: 'Newsletter not found.' });
    }
    res.json(newsletter);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message, errors: error.details });
    }
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const deleted = await newsletterUpdateService.remove(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Newsletter not found.' });
    }
    res.json({ message: 'Newsletter deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function uploadFile(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const newsletter = await newsletterUpdateService.attachFile(id, req.file);
    if (!newsletter) {
      return res.status(404).json({ message: 'Newsletter not found.' });
    }
    res.json(newsletter);
  } catch (error) {
    next(error);
  }
}

async function summarize(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const result = await newsletterUpdateService.summarize(id);
    if (!result) {
      return res.status(404).json({ message: 'Newsletter not found.' });
    }
    res.json(result);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

async function review(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const result = await newsletterUpdateService.review(id, req.body);
    if (!result) {
      return res.status(404).json({ message: 'Newsletter not found.' });
    }
    res.json(result);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

module.exports = { list, getOne, create, update, remove, uploadFile, summarize, review };
