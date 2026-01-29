import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const listApprovals = () => axios.get(`${API_BASE}/approvals`).then(r => r.data);
export const createDummy = () => axios.post(`${API_BASE}/approvals`).then(r => r.data);
export const runAgent = () => axios.post(`${API_BASE}/agent/run`).then(r => r.data);
export const approve = (id) => axios.post(`${API_BASE}/approvals/${id}/approve`).then(r => r.data);
export const listAudit = () => axios.get(`${API_BASE}/audit`).then(r => r.data);
