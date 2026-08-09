// Dev 1 — compliance_records request handlers (mirrors recordRoutes.js).

const path = require('path');
const fs = require('fs');
const complianceContentService = require('../services/complianceContentService');

function list(req, res) {
  const result = complianceContentService.list(req.query, req.user);
  res.json(result);
}

function getById(req, res) {
  const record = complianceContentService.getById(Number(req.params.id), req.user);
  res.json({ data: record });
}

function create(req, res) {
  const record = complianceContentService.create(req.body, req.user);
  res.status(201).json({ data: record });
}

function update(req, res) {
  const record = complianceContentService.update(Number(req.params.id), req.body, req.user);
  res.json({ data: record });
}

function archive(req, res) {
  const record = complianceContentService.archive(Number(req.params.id), req.user);
  res.json({ data: record });
}

function addComponent(req, res) {
  const component = complianceContentService.addComponent(Number(req.params.id), req.body, req.user);
  res.status(201).json({ data: component });
}

function addAttachment(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const attachment = complianceContentService.addAttachment(
    Number(req.params.id),
    {
      fileName: req.file.originalname,
      filePath: `/uploads/records/${path.basename(req.file.path)}`,
      fileType: req.file.mimetype,
    },
    req.user
  );
  return res.status(201).json({ data: attachment });
}

async function aiAssist(req, res) {
  const result = await complianceContentService.aiAssist(Number(req.params.id), req.body, req.user);
  res.json({ data: result });
}

function listVersions(req, res) {
  const versions = complianceContentService.listVersions(Number(req.params.id), req.user);
  res.json({ data: versions });
}

function updateComponent(req, res) {
  const component = complianceContentService.updateComponent(
    Number(req.params.id),
    Number(req.params.componentId),
    req.body,
    req.user
  );
  res.json({ data: component });
}

function removeComponent(req, res) {
  complianceContentService.removeComponent(Number(req.params.id), Number(req.params.componentId), req.user);
  res.status(204).end();
}

function removeAttachment(req, res) {
  const deleted = complianceContentService.removeAttachment(
    Number(req.params.id),
    Number(req.params.attachmentId),
    req.user
  );
  // Best-effort disk cleanup — the DB row is already gone either way, so a
  // missing/already-removed file must never turn this into a failed request.
  fs.unlink(path.join(__dirname, '..', '..', deleted.filePath), () => {});
  res.status(204).end();
}

module.exports = {
  list,
  getById,
  create,
  update,
  archive,
  addComponent,
  updateComponent,
  removeComponent,
  addAttachment,
  removeAttachment,
  aiAssist,
  listVersions,
};
