// store/common.js
export const BASE_URL =
  import.meta.env.MODE === "development"
    ? "/api"  // Uses Vite proxy (no CORS)
    : "/api";
