import axios from "axios";

const api = axios.create({
  baseURL: "https://nexhire-backend-br6y.onrender.com/api",
  withCredentials: true,
  timeout:     15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nx_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("nx_token");
      window.location.href = "/login";
    }
    return Promise.reject(err?.response?.data || err);
  }
);

export default api;
