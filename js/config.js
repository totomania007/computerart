/* ============================================================
   Classwork Hub — config.js
   การตั้งค่า Cloudinary, Cloudflare API, และความปลอดภัย PIN
   ============================================================ */
'use strict';

const APP_CONFIG = {
  // Cloudinary Direct Upload Configuration
  cloudinary: {
    cloudName: 'ogdfbbpw',
    apiKey: '655295393941347',
    uploadPreset: 'computer_art',
    uploadUrl: 'https://api.cloudinary.com/v1_1/ogdfbbpw/auto/upload'
  },

  // Security
  teacherPin: '1234',

  // API Mode & Endpoint
  getApiUrl() {
    const custom = localStorage.getItem('cwh_api_url');
    if (custom !== null) return custom.trim();
    // If running on a live web host (not file:// protocol), default to /api
    if (window.location.protocol.startsWith('http')) {
      return window.location.origin + '/api';
    }
    return ''; // LocalStorage Mode on file://
  },

  setApiUrl(url) {
    if (!url || !url.trim()) {
      localStorage.removeItem('cwh_api_url');
    } else {
      localStorage.setItem('cwh_api_url', url.trim());
    }
  }
};