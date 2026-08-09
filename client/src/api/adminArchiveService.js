import axiosClient from './axiosClient';

function list(params) {
  return axiosClient.get('/admin/archives', { params }).then((response) => response.data);
}
function restore(entityType, id) {
  return axiosClient.post(`/admin/archives/${entityType}/${id}/restore`).then((response) => response.data);
}
function permanentlyDelete(entityType, id) {
  return axiosClient.delete(`/admin/archives/${entityType}/${id}`).then((response) => response.data);
}

export default { list, restore, permanentlyDelete };
