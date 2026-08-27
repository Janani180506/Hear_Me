export const API_BASE =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.DEV
    ? "http://localhost:8000"
    : "https://hearme-2-uvm0.onrender.com");
