// ADMIN-APPROVED EMAIL — step 1: queue an email and ask the admin to approve it.
// Any editor can request a send; nothing goes out until the admin clicks Approve.
const { readJson, supaService, getCaller, sendEmail, appUrl } = require('../lib/util');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const caller = await getCaller(req);
  if (!caller || caller.role === 'viewer') return res.status(403).json({ error: 'forbidden' });

  const { to, subject, bodyHtml } = await readJson(req);
  if (!to || !subject || !bodyHtml) return res.status(400).json({ error: 'missing fields' });

  const supa = supaService();
  const token = crypto.randomBytes(24).toString('hex');
  const { data, error } = await supa.from('email_queue')
    .insert({ to_email: to, subject, body_html: bodyHtml, token, requested_by: caller.email })
    .select('id').single();
  if (error) return res.status(500).json({ error: error.message });

  const admin = process.env.ADMIN_EMAIL || 'vikaskdem@gmail.com';
  const approveUrl = appUrl() + '/api/email-approve?token=' + token + '&action=approve';
  const rejectUrl  = appUrl() + '/api/email-approve?token=' + token + '&action=reject';
  const review = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#e04e1f">KDEM Tracker — email approval needed</h2>
      <p><b>${caller.email}</b> wants to send an email through the tracker:</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="color:#666;padding:4px 10px 4px 0">To</td><td>${escapeHtml(to)}</td></tr>
        <tr><td style="color:#666;padding:4px 10px 4px 0">Subject</td><td>${escapeHtml(subject)}</td></tr>
      </table>
      <div style="border:1px solid #e4e0da;border-radius:8px;padding:12px;margin:12px 0;background:#faf9f7">${bodyHtml}</div>
      <p>
        <a href="${approveUrl}" style="background:#1f7a46;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Approve &amp; send</a>
        &nbsp;&nbsp;
        <a href="${rejectUrl}" style="background:#c23a2a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Reject</a>
      </p>
      <p style="color:#999;font-size:12px">If you didn't expect this, click Reject. Link is single-use.</p>
    </div>`;
  try { await sendEmail(admin, 'Approve email: ' + subject, review); }
  catch (e) { return res.status(500).json({ error: 'queued but approval email failed: ' + e.message }); }

  return res.status(200).json({ ok: true, queued: data.id, approvalSentTo: admin });
};

function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
