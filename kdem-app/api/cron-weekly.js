// WEEKLY SUMMARY + OVERDUE REMINDERS (Vercel Cron, free).
// Emails the admin a KPI summary and the list of follow-ups now overdue.
// Scheduled in vercel.json. Protected by CRON_SECRET.
const { supaService, sendEmail } = require('../lib/util');
const crypto = require('crypto');

// Constant-time compare so the secret can't be recovered by timing the response.
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  // Fail CLOSED. This used to be `if (CRON_SECRET && secret !== CRON_SECRET)`,
  // which skipped the check entirely whenever CRON_SECRET was not configured —
  // so anyone who knew the URL could run the job and trigger an email.
  const expected = process.env.CRON_SECRET || '';
  const supplied = (req.headers['authorization'] || '').replace('Bearer ', '')
                   || (req.query && req.query.key) || '';
  if (!expected) return res.status(503).json({ error: 'cron_secret_not_configured' });
  if (!safeEqual(supplied, expected)) return res.status(401).json({ error: 'unauthorized' });

  const supa = supaService();
  // Supabase caps a response at 1000 rows, so page through rather than
  // silently reporting on only the first 1000 startups.
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.from('startups').select('data')
      .order('updated_at', { ascending: false }).order('id', { ascending: true })
      .range(from, from + 999);
    if (error) return res.status(500).json({ error: error.message });
    const batch = data || [];
    for (const r of batch) rows.push(r.data);
    if (batch.length < 1000) break;
    if (from > 60000) break;
  }
  const today = new Date().toISOString().slice(0, 10);
  const c = f => rows.filter(f).length;
  const FI_PROG = ['Documents in Preparation','Partially Submitted','Submitted - Awaiting Outcome','Under Department Review','Query Raised / Docs Pending'];

  const k = {
    total: rows.length,
    dpiit: c(r => r.dpiit === 'Yes'),
    skYes: c(r => r.skReg === 'Yes'),
    skProg: c(r => r.skReg === 'In Progress'),
    notReg: c(r => r.skReg === 'No' || r.skReg === 'No - Not Aware'),
    fiYes: c(r => r.fiApplied === 'Yes'),
    fiProg: c(r => FI_PROG.includes(r.appStage)),
    benefits: c(r => r.appStage === 'Benefit Received / Disbursed'),
    met: c(r => r.met === 'Yes'),
    kitsPending: c(r => r.kitsStatus === 'Pending with KITS' || r.kitsStatus === 'In Progress at KITS')
  };
  const overdue = rows.filter(r => r.fuDate && r.fuDate < today);
  const CLUSTERS = ['Bengaluru Urban','H-D-B Cluster','Mangaluru Cluster','Mysuru Cluster','Shivamogga Cluster','Kalaburagi Cluster','Tumakuru Cluster'];

  const row = (l, v) => `<tr><td style="padding:3px 14px 3px 0;color:#555">${l}</td><td style="font-weight:700;font-family:monospace">${v}</td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px">
      <h2 style="color:#e04e1f">KDEM Startup Tracker — Weekly Summary</h2>
      <p style="color:#777">${today}</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${row('Total startups engaged', k.total)}
        ${row('DPIIT recognised', k.dpiit)}
        ${row('Registered on Startup Karnataka', k.skYes)}
        ${row('Registration in progress', k.skProg)}
        ${row('Not yet registered', k.notReg)}
        ${row('Fiscal incentive applied', k.fiYes)}
        ${row('Fiscal incentive in progress', k.fiProg)}
        ${row('Benefits received / disbursed', k.benefits)}
        ${row('Founders met in person', k.met)}
        ${row('Pending with KITS', k.kitsPending)}
      </table>
      <h3 style="color:#e04e1f;margin-top:20px">Cluster-wise engaged</h3>
      <table style="border-collapse:collapse;font-size:14px">
        ${CLUSTERS.map(cl => row(cl, rows.filter(r => r.cluster === cl).length)).join('')}
      </table>
      <h3 style="color:#c23a2a;margin-top:20px">Follow-ups overdue (${overdue.length})</h3>
      <ul style="font-size:13px">${overdue.slice(0, 40).map(r => `<li>${esc(r.name)} — due ${esc(r.fuDate)}</li>`).join('') || '<li>None</li>'}</ul>
    </div>`;

  try {
    await sendEmail(process.env.ADMIN_EMAIL || 'vikaskdem@gmail.com', 'KDEM Tracker — Weekly Summary (' + today + ')', html);
    return res.status(200).json({ ok: true, total: k.total, overdue: overdue.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
