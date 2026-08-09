// Shared — cross-entity search request handler (Section 14.6).

const searchService = require('../services/searchService');

async function search(req, res) {
  const result = await searchService.search(
    {
      search: req.query.q,
      country: req.query.country,
      category: req.query.category,
      workerType: req.query.workerType,
      status: req.query.status,
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit,
    },
    req.user
  );
  res.json(result);
}

module.exports = { search };
