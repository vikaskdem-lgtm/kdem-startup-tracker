// ADMIN-APPROVED EMAIL — step 2: the admin clicks the link in their inbox.
// Possessing the token (sent only to the admin) authorizes the action.
const { supaService, sendEmail } = require('../lib/util');

module.exports = async (req, res) => {
  const token = (req.query && req.query.token) || '';
  const action = (req.query && req.query.action) || 'approve';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!token) return res.status(400).send(page('Missing token.'));

  const supa = supaService();
  const { data: row } = await supa.from('email_queue').select('*').eq('token', token).maybeSingle();
  if (!row) return res.status(404).send(page('This approval link is not valid.'));
  if (row.status !== 'pending') return res.status(200).send(page('This email was already ' + row.status + '.'));

  if (action === 'reject') {
    await supa.from('email_queue').update({ status: 'rejected' }).eq('id', row.id);
    return res.status(200).send(page('Email rejected. Nothing was sent.'));
  }

  try {
    await sendEmail(row.to_email, row.subject, row.body_html);
    await supa.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id);
    return res.status(200).send(page('Approved — email sent to ' + escapeHtml(row.to_email) + '.'));
  } catch (e) {
    return res.status(500).send(page('Could not send: ' + escapeHtml(e.message)));
  }
};

function page(msg) {
  return `<!doctype html><meta charset=utf-8><div style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;text-align:center">
    <h2 style="color:#e04e1f">KDEM Tracker</h2><p style="font-size:16px">${msg}</p></div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
