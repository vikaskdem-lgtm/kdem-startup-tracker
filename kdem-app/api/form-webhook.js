// LIVE GOOGLE-FORM SYNC
// Google Apps Script posts each new form response here. We auto-map the
// columns, de-duplicate against existing startups, then insert or update.
const { readJson, supaService } = require('../lib/util');
const { mapAnswers, blankStartup, norm, simNames, toCluster } = require('../lib/mapping');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if ((req.headers['x-webhook-secret'] || '') !== process.env.FORM_WEBHOOK_SECRET)
    return res.status(401).json({ error: 'unauthorized' });

  const body = await readJson(req);
  const answers = body.answers || {};
  const formName = body.formName || 'Google Form';
  const rec = mapAnswers(answers);
  if (!rec.name && !rec.email && !rec.dpiitNo)
    return res.status(200).json({ ok: true, skipped: 'no identifying fields' });

  const supa = supaService();
  const now = new Date().toISOString();

  // ---- find an existing match: DPIIT no, then email, then normalized name ----
  let match = null;
  const dn = (rec.dpiitNo || '').replace(/\s/g, '').toLowerCase();
  const em = (rec.email || '').toLowerCase();
  const nm = norm(rec.name || '');
  const ors = [];
  if (dn) ors.push(`dpiit_no.eq.${dn}`);
  if (em) ors.push(`email.eq.${em}`);
  if (nm) ors.push(`name_norm.eq.${nm}`);
  if (ors.length) {
    const { data } = await supa.from('startups').select('id,data').or(ors.join(',')).limit(1);
    if (data && data.length) match = data[0];
  }

  if (match) {
    // ---- UPDATE existing: fill empty fields, add founder, log remark ----
    const r = Object.assign(blankStartup(), match.data);
    ['district','cluster','sector','stage','dpiit','dpiitNo','skReg','kitsNo','appliedSK','fiApplied',
     'appStage','aware','reason','support','event','priority','consent','planning','met','notes']
      .forEach(k => { if (rec[k] != null && rec[k] !== '') r[k] = rec[k]; });
    if (rec.incentives && rec.incentives.length)
      r.incentives = Array.from(new Set([...(r.incentives || []), ...rec.incentives]));
    if (rec.district) r.cluster = toCluster(rec.district);
    r.founders = r.founders || [];
    if (rec.founder && !r.founders.some(f => norm(f.name) === norm(rec.founder)))
      r.founders.push({ name: rec.founder, email: rec.email || '', phone: rec.phone || '' });
    r.remarks = r.remarks || [];
    r.remarks.push({ text: 'Updated from form: ' + formName, at: now, by: 'form', byName: formName });
    r.history = r.history || [];
    r.history.push({ action: 'Form update', at: now, by: 'form', byName: formName });
    await supa.from('startups').update({ data: r, updated_at: now, updated_by: 'form:' + formName }).eq('id', match.id);
    return res.status(200).json({ ok: true, mode: 'updated', id: match.id });
  }

  // ---- possible duplicate (similar name, different contact) ----
  let possible = null;
  if (nm) {
    const { data } = await supa.from('startups').select('id,data').limit(2000);
    if (data) possible = data.find(s => (s.data && simNames(s.data.name, rec.name) >= 0.6 && norm(s.data.name) !== nm));
  }

  // ---- INSERT new ----
  const r = blankStartup();
  r.id = 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e6);
  Object.keys(rec).forEach(k => { if (rec[k] != null) r[k] = rec[k]; });
  r.founders = [{ name: rec.founder || '', email: rec.email || '', phone: rec.phone || '' }];
  r.source = formName; r.date = now.slice(0, 10);
  r.history = [{ action: 'Imported (form)', at: now, by: 'form', byName: formName }];
  r.remarks = [];
  if (possible) r.remarks.push({ text: '⚠ Possible duplicate of "' + possible.data.name + '" — verify on Duplicates page', at: now, by: 'form', byName: formName });
  await supa.from('startups').insert({ id: r.id, data: r, updated_at: now, updated_by: 'form:' + formName });
  return res.status(200).json({ ok: true, mode: possible ? 'new (possible dup flagged)' : 'new', id: r.id });
};
