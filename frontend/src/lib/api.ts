import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response) {
      console.error("API error:", err.response.status, err.response.data);
    } else {
      console.error("Network error:", err.message);
    }
    return Promise.reject(err);
  }
);