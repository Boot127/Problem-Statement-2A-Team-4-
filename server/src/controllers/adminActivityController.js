const service = require('../services/adminActivityService');

async function list(req, res) { res.json(await service.list(req.query)); }
async function overview(_req, res) { res.json(await service.overview()); }

module.exports = { list, overview };
