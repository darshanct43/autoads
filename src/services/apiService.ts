import axios from 'axios';

const API_BASE_URL = '/api';

export const apiService = {
  async getHealth() {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },

  async getSystemStatus() {
    const response = await axios.get(`${API_BASE_URL}/system/status`);
    return response.data;
  },

  async sendOTP(phoneNumber: string) {
    const response = await axios.post(`${API_BASE_URL}/otp/send`, { phoneNumber });
    return response.data;
  },

  async verifyOTP(phoneNumber: string, code: string) {
    const response = await axios.post(`${API_BASE_URL}/otp/verify`, { phoneNumber, code });
    return response.data;
  },

  // Example of a backend-proxied payment simulation
  async initiatePayout(driverId: string, amount: number) {
    const response = await axios.post(`${API_BASE_URL}/payouts/initiate`, {
      driverId,
      amount
    });
    return response.data;
  },

  async resetPassword(phoneNumber: string, newPassword: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      phoneNumber,
      newPassword
    });
    return response.data;
  }
};
