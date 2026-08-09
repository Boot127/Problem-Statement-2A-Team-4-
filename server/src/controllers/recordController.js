// Dev 1 — compliance_records request handlers (mirrors recordRoutes.js).

const path = require('path');
const fs = require('fs');
const complianceContentService = require('../services/complianceContentService');

async function list(req, res) {
  const result = await complianceContentService.list(req.query, req.user);
  res.json(result);
}

async function getById(req, res) {
  const record = await complianceContentService.getById(Number(req.params.id), req.user);
  res.json({ data: record });
}

async function create(req, res) {
  const record = await complianceContentService.create(req.body, req.user);
  res.status(201).json({ data: record });
}

async function update(req, res) {
  const record = await complianceContentService.update(Number(req.params.id), req.body, req.user);
  res.json({ data: record });
}

async function archive(req, res) {
  const record = await complianceContentService.archive(Number(req.params.id), req.user);
  res.json({ data: record });
}

async function addComponent(req, res) {
  const component = await complianceContentService.addComponent(Number(req.params.id), req.body, req.user);
  res.status(201).json({ data: component });
}

async function addAttachment(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const attachment = await complianceContentService.addAttachment(
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

async function listVersions(req, res) {
  const versions = await complianceContentService.listVersions(Number(req.params.id), req.user);
  res.json({ data: versions });
}

async function updateComponent(req, res) {
  const component = await complianceContentService.updateComponent(
    Number(req.params.id),
    Number(req.params.componentId),
    req.body,
    req.user
  );
  res.json({ data: component });
}

async function removeComponent(req, res) {
  await complianceContentService.removeComponent(Number(req.params.id), Number(req.params.componentId), req.user);
  res.status(204).end();
}

async function removeAttachment(req, res) {
  const deleted = await complianceContentService.removeAttachment(
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
