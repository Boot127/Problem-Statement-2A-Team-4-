const service = require('../services/permitGuideDocxService');

async function downloadDocx(req, res, next) {
  try {
    const { buffer, fileName } = await service.generateGuide(req.params.id);
    res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.attachment(fileName);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = { downloadDocx };
