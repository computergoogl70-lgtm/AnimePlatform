import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

export function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
