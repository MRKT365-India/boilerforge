import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000,
});

// Token refresh interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh here
    }
    return Promise.reject(error);
  }
);

export default api;
