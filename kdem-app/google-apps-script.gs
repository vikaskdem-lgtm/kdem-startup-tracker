/**
 * KDEM Startup Tracker — LIVE GOOGLE-FORM SYNC
 * ------------------------------------------------------------
 * Paste this into each Google Form's Apps Script, set the two
 * constants, and add an "On form submit" trigger. Every new
 * response is sent to your tracker instantly and de-duplicated.
 *
 * SETUP (per form, ~2 minutes):
 *  1. Open the Form → ⋮ (top right) → "Script editor".
 *  2. Delete anything there, paste this whole file.
 *  3. Set WEBHOOK_URL and WEBHOOK_SECRET below.
 *  4. Save. Then Triggers (clock icon, left) → Add Trigger:
 *        Function: onFormSubmit
 *        Event source: From form
 *        Event type: On form submit
 *     Save and authorize when prompted.
 *  5. Done. Repeat for each form (same URL + secret).
 * ------------------------------------------------------------
 */

var WEBHOOK_URL    = 'https://your-app.vercel.app/api/form-webhook';  // <-- your Vercel URL
var WEBHOOK_SECRET = 'paste-the-same-FORM_WEBHOOK_SECRET-here';        // <-- must match Vercel env
var FORM_NAME      = '';  // optional label; blank = use the form's own title

function onFormSubmit(e) {
  var answers = {};
  // e.namedValues = { "Question title": ["answer", ...], ... }
  var nv = e && e.namedValues ? e.namedValues : {};
  for (var q in nv) {
    answers[q] = (nv[q] || []).join(', ');
  }
  var name = FORM_NAME;
  try { if (!name) name = FormApp.getActiveForm().getTitle(); } catch (err) { name = 'Google Form'; }

  var payload = { formName: name || 'Google Form', answers: answers };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
