import axiosClient from './axiosClient';

function overview() {
  return axiosClient.get('/admin/overview').then((response) => response.data);
}

function list(params = {}) {
  return axiosClient.get('/admin/activity', { params }).then((response) => response.data);
}

export default { overview, list };
