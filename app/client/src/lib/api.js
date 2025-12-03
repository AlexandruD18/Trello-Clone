const API_BASE_URL = '/api';

const api = {
  async request(method, endpoint, data = null) {
    const token = localStorage.getItem('token');
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || 'Request failed');
    }

    return { data: responseData };
  },

  get(endpoint) {
    return this.request('GET', endpoint);
  },

  post(endpoint, data) {
    return this.request('POST', endpoint, data);
  },

  put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  },

  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
};

export default api;
