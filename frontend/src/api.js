import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function getOverview(params = new URLSearchParams()){
  const res = await client.get(`/api/overview?${params.toString()}`)
  return res.data
}

export async function getPerformance(params = new URLSearchParams()){
  try {
    console.log('API: Requesting performance data...');
    const res = await client.get(`/api/performance?${params.toString()}`);
    console.log('API: Received response:', res.data);
    if (!res.data || !res.data.performance) {
      throw new Error('Invalid data structure from API');
    }
    return res.data;
  } catch (error) {
    console.error('API Error in getPerformance:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

export async function getErrors(params = new URLSearchParams()){
  console.log('API: Requesting error data with params:', params.toString());  // Debug log
  try {
    const res = await client.get(`/api/errors?${params.toString()}`);
    console.log('API: Received error data:', res.data);  // Debug log
    return res.data;
  } catch (error) {
    console.error('API Error in getErrors:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}


export async function getAlerts(params = new URLSearchParams()){
  const res = await client.get(`/api/alerts?${params.toString()}`)
  return res.data
}

export async function getUsers() {
  const res = await client.get('/api/users')
  return res.data
}



export async function getAnalytics(params = new URLSearchParams()){
  const res = await client.get(`/api/analytics/dashboard?${params.toString()}`)
  return res.data
}

export async function getSummary(params = new URLSearchParams()) {
  try {
    console.log('API: Requesting summary data with params:', params.toString());  // Debug log
    const res = await client.get(`/api/summary?${params.toString()}`);
    console.log('API: Received summary data:', res.data);  // Debug log
    if (!res.data || !res.data.summary) {
      throw new Error('Invalid summary data structure');
    }
    return res.data;
  } catch (error) {
    console.error('Error fetching summary:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

export async function getBotAnalysis(botId, params = new URLSearchParams()) {
  try {
    const res = await client.get(`/api/analysis/${botId}?${params.toString()}`)
    if (res.data.error) {
      throw new Error(res.data.error)
    }
    return res.data
  } catch (error) {
    console.error(`Error fetching analysis for bot ${botId}:`, error)
    throw error
  }
}

export default client
