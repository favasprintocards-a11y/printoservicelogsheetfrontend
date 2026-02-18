import axios from 'axios';

let baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (baseURL && !baseURL.endsWith('/api') && !baseURL.includes('localhost')) {
    baseURL = baseURL.endsWith('/') ? `${baseURL}api` : `${baseURL}/api`;
}

const API = axios.create({
    baseURL,
});

export default API;
