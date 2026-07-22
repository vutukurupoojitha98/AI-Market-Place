import axios from "axios";
export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const api = axios.create({ baseURL: API, withCredentials: true });
export default api;

export const fmt = (n, cur = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: cur }).format(n);
