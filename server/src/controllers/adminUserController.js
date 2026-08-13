const adminUserService = require('../services/adminUserService');

async function list(_req, res) {
  res.json({ users: await adminUserService.listUsers() });
}

async function getOne(req, res) {
  res.json({ user: await adminUserService.getUser(req.params.userId) });
}

async function changeRole(req, res) {
  const user = await adminUserService.changeRole(req.params.userId, req.body?.role, req.user);
  res.json({ user });
}

module.exports = { list, getOne, changeRole };
