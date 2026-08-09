// Shared — login, logout, current-user calls (HLD Section 14.1).

import axiosClient, { setToken } from './axiosClient';

async function login(email, password) {
  const { data } = await axiosClient.post('/auth/login', { email, password });
  setToken(data.token);
  return data.user;
}

async function logout() {
  try {
    await axiosClient.post('/auth/logout');
  } finally {
    setToken(null);
  }
}

async function me() {
  const { data } = await axiosClient.get('/auth/me');
  return data.user;
}

export default { login, logout, me };
