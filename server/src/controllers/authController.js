// Shared — login, logout, current-user handlers (Section 14.1).

const authService = require('../services/authService');

async function login(req, res) {
  const { email, password } = req.body;
  const { token, user } = await authService.login(email, password);
  res.json({ token, user });
}

function logout(req, res) {
  authService.logout(req.user?.id);
  res.status(204).end();
}

function me(req, res) {
  const user = authService.getById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json({ user });
}

module.exports = { login, logout, me };
