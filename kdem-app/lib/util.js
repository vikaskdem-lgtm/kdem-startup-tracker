// Shared server-side helpers for the Vercel serverless functions.
const { createClient } = require('@supabase/supabase-js');

// Read and JSON-parse the request body (Vercel Node functions don't auto-parse).
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// Supabase client with the service-role key — bypasses RLS. SERVER ONLY.
function supaService() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Verify the caller's Supabase access token and return their profile role.
async function getCaller(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const supa = supaService();
  const { data: { user } = {} } = await supa.auth.getUser(token);
  if (!user) return null;
  const { data: prof } = await supa.from('profiles').select('role,email').eq('id', user.id).maybeSingle();
  return { id: user.id, email: user.email, role: (prof && prof.role) || 'viewer' };
}

// Send an email through Resend's REST API (no extra dependency).
async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'KDEM Tracker <onboarding@resend.dev>';
  if (!key) throw new Error('RESEND_API_KEY not set');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html })
  });
  if (!resp.ok) throw new Error('Resend error: ' + resp.status + ' ' + (await resp.text()));
  return resp.json();
}

function appUrl() {
  return (process.env.APP_URL || '').replace(/\/$/, '');
}

module.exports = { readJson, supaService, getCaller, sendEmail, appUrl };
