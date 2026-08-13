import axiosClient from './axiosClient';

function list() {
  return axiosClient.get('/admin/users').then((response) => response.data.users);
}

function getById(id) {
  return axiosClient.get(`/admin/users/${id}`).then((response) => response.data.user);
}

function changeRole(id, role) {
  return axiosClient.patch(`/admin/users/${id}/role`, { role }).then((response) => response.data.user);
}

export default { list, getById, changeRole };
