// api/proxy.js — Vercel Serverless Function
// This acts as a middleman between your frontend and Google Apps Script
// Solves CORS completely!

export default async function handler(req, res) {
  // Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔴 PASTE YOUR APPS SCRIPT URL HERE
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfhXWLWtFVneS69ceNcoHxZvtV5ccnC7GFTVfcpG5dUWik6vt5z2s7B1Y-dYIAyay3vg/exec';

  try {
    if (req.method === 'GET') {
      // Forward GET requests
      const params = new URLSearchParams(req.query).toString();
      const url = params ? `${APPS_SCRIPT_URL}?${params}` : APPS_SCRIPT_URL;
      const response = await fetch(url, { redirect: 'follow' });
      const data = await response.json();
      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      // Forward POST requests
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        redirect: 'follow'
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
