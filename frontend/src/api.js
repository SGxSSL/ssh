import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const login = (username, password) => axios.post(`${API_BASE}/login`, { username, password }).then(r => r.data);
export const listApprovals = (requester) => axios.get(`${API_BASE}/approvals`, { params: { requester } }).then(r => r.data);
export const createDummy = (requester) => axios.post(`${API_BASE}/approvals`, null, { params: { requester } }).then(r => r.data);
export const runAgent = () => axios.post(`${API_BASE}/agent/run`).then(r => r.data);
export const approve = (id) => axios.post(`${API_BASE}/approvals/${id}/approve`).then(r => r.data);
export const listAudit = () => axios.get(`${API_BASE}/audit`).then(r => r.data);
