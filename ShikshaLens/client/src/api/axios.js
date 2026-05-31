import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error
      || (error.code === 'ERR_NETWORK' ? 'API is unreachable. Start the backend with npm run dev.' : error.message)
      || 'ClassPulse could not reach the server.';
    console.error('[client-api]', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
