import json, re

tpl = open('/home/claude/web/template.html').read()
alllists = json.load(open('/home/claude/web/lists.json'))
keep = ['Source of Contact','Sector','Startup Stage','Application Stage','Support Required','KDEM Action Taken','Incentive Applied','SK Registration Status','KITS Confirmation Tracker update','Fiscal Incentives','Priority','Yes / No']
lists = {k: alllists[k] for k in keep if k in alllists}
RES = [('Registration','Startup Karnataka Registration (official form)','https://docs.google.com/forms/d/e/1FAIpQLSdiZM7SwC6CL2b2kJgCAjACv8FVgqXzYZqnpj0n-qfE7vZIyA/viewform'),('Registration','Registration Status Update form','https://forms.gle/xcYKnKHWNnMJtDaj6'),('Registration','Policy, Registration & Fiscal Incentive Tracker + Support','https://docs.google.com/forms/d/e/1FAIpQLSf3D5odP8hqiFGX3Ynkd4ozcsKbahLwU3uRGPXUl30J_rA6GQ/viewform'),('Registration','Fiscal Incentive Tracker (fill after applying / to log issues)','https://docs.google.com/forms/d/1NOs46VavazTo-2LurzfV-mDaaf_4cl46ii1U4z7soLw/viewform'),('Fiscal Incentive Application Forms','State GST Reimbursement','https://docs.google.com/forms/d/1TACjnzDUt6Z5Jd-SFQTKkwQ6BuXAzZGzFGaE4auOz30/edit'),('Fiscal Incentive Application Forms','Internship Support','https://docs.google.com/forms/d/1x37Tx3XgJL7wR7OaPlKoGUNVFutFlVIYdvHIfwkb_SI/edit'),('Fiscal Incentive Application Forms','Patent Reimbursement','https://docs.google.com/forms/d/1pPCUaeSAzEdWFISG2C07zb8rdpfKZ3eJz9MM_kLYM_U/edit'),('Fiscal Incentive Application Forms','PF/ESI Reimbursement','https://docs.google.com/forms/d/1mtoL0qpWJiu0q9o3-gAjSjMUa62m0eePZgnGXHrfXPU/edit'),('Fiscal Incentive Application Forms','R&D Grant Support','https://docs.google.com/forms/d/1Apu_aAqSY0tqpCrDv8EG1wl9cxc63MbJrRrde5tGYGM/edit'),('Fiscal Incentive Application Forms','Cloud Storage Reimbursement','https://docs.google.com/forms/d/1BP939XpAmXwCp2FP6Mr_V3yMcDry_8ULX5bsotRPItE/edit'),('Fiscal Incentive Application Forms','Quality Certification Cost','https://docs.google.com/forms/d/1YJfpRmsqRQLwu8hwqL5wNFFB8z3l9rUaonzc-8k8Le0/edit'),('Fiscal Incentive Application Forms','Marketing Cost Reimbursement','https://docs.google.com/forms/d/1UN7Z0TiK6iN-FHlI96sWNiUokKw0oCAHNnLM2nnNTj8/edit'),('Fiscal Incentive Application Forms','EIT-BT — Incentives 2025-30 (official details)','https://eitbt.karnataka.gov.in/startup/public/151/incentives-2025-30/en'),('Community & Updates','DPIIT × Startup Karnataka — Founder Connect (WhatsApp Channel)','https://whatsapp.com/channel/0029VbCBg4O7T8bPzPYJzo2T'),('Community & Updates','Startup Policy Cafe — WhatsApp Community','https://chat.whatsapp.com/KkAWubFetQ2ASQ2kCFqSMm'),('Events & Platforms','Startup X-Factor — Session 3 RSVP','https://docs.google.com/forms/d/e/1FAIpQLSeFCqwpknw96MapuT93SznFPQxhTSTEcO5sJ_fIMngaVGI4tw/viewform'),('Events & Platforms','Startup X-Factor — Session 4 RSVP','https://forms.gle/PVDUdM2F3SLvumoz5'),('Events & Platforms','AMA Registration','https://forms.gle/AEKWixhoWYxTuzVs8'),('Events & Platforms','Survey on Startup Funding & Ecosystem Investments','https://docs.google.com/forms/d/e/1FAIpQLSdwOigCXHg2ZkkMj6qhVan6Qhm0NdeJfZ0aS-oCxk5Td50F0A/viewform'),('Events & Platforms','Elevate — Startup Karnataka','https://elevate.startupkarnataka.in/#contact'),('Events & Platforms','KITE Platform','https://kite-v2-three.vercel.app/')]
res = [dict(group=g, title=t, url=u) for g, t, u in RES]
logo = open('/home/claude/web/logo_uri.txt').read().strip()

# This is a hosted web page (not a sandboxed artifact) — add a proper <head>.
HEAD = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<link rel="icon" href="' + logo + '">')

# placeholders
tpl = tpl.replace('/*__SEED__*/', '[]')
tpl = tpl.replace('/*__LISTS__*/', json.dumps(lists, ensure_ascii=False))
tpl = tpl.replace('/*__RES__*/', json.dumps(res, ensure_ascii=False))
tpl = tpl.replace('/*__LOGO__*/', logo)

# add supabase-js UMD after the xlsx CDN
tpl = tpl.replace(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n'
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>')

# gate app start on auth instead of booting immediately
tpl = tpl.replace('\nboot();\n', '\nwindow.__startApp=boot;\n')

# neutral connecting banner (remove the "open inside Claude" wording)
tpl = tpl.replace("Live sync is connecting… showing the loaded data. Open this page inside Claude and sign in to edit and share with your team.",
                  "Connecting to the live database…")

# add a Sign out button in the header
tpl = tpl.replace('<button class="iconbtn" id="exportBtn">Export Excel</button>',
                  '<button class="iconbtn" id="exportBtn">Export Excel</button>\n    <button class="iconbtn" id="signoutBtn">Sign out</button>')

# add an "Email status (admin approval)" button in the detail share row
tpl = tpl.replace(
    "el('button',{class:'btn sec sm',onclick:()=>copyText(r.email||((r.founders||[])[0]||{}).email||'','Email copied')},'Copy email')));",
    "el('button',{class:'btn sec sm',onclick:()=>copyText(r.email||((r.founders||[])[0]||{}).email||'','Email copied')},'Copy email'),"
    "el('button',{class:'btn sec sm',onclick:async()=>{const to=r.email||((r.founders||[])[0]||{}).email;if(!to){toast('No email on record');return;}if(!window.__requestEmail){toast('Email not configured');return;}try{await window.__requestEmail(to,'Startup Karnataka — status update',summaryText(r).replace(/\\n/g,'<br>'));toast('Sent to admin for approval');}catch(e){toast('Could not request email');}}},'Email status (admin approval)')));")

# auth-gate CSS
AUTH_CSS = '''
#authgate{position:fixed;inset:0;background:var(--masthead);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
#authgate .authbox{background:var(--surface);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:30px 28px;width:min(360px,100%);display:flex;flex-direction:column;gap:11px;text-align:center}
#authgate .authbox img{height:52px;margin:0 auto 4px}
#authgate h2{font-family:var(--display);font-size:20px}
#authgate .authsub{color:var(--muted);font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.1em}
#authgate input{width:100%;padding:11px 12px;font-size:14px}
#authgate button{background:var(--primary);color:var(--primary-ink);border:0;border-radius:var(--radius-sm);padding:11px;font-size:14px;font-weight:700;cursor:pointer}
#authgate #auth_msg{color:var(--bad);font-size:12.5px;min-height:16px}
'''
tpl = tpl.replace('</style>', AUTH_CSS + '</style>', 1)

# the Supabase shim — provides window.claude{use}, auth gate, email helper
SHIM = r'''
<script>
(async function(){
  const LOGO = "__LOGO__";
  let cfg={};
  try{cfg=await (await fetch('/api/public-config')).json();}catch(e){}
  window.__ADMIN_EMAIL=(cfg.adminEmail||'').toLowerCase();
  if(!cfg.url||!cfg.anonKey){document.body.innerHTML='<p style="font-family:sans-serif;padding:40px">Server not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.</p>';return;}
  const sb=window.supabase.createClient(cfg.url,cfg.anonKey);
  window.__sb=sb;

  function showLogin(msg){
    let o=document.getElementById('authgate');
    if(!o){o=document.createElement('div');o.id='authgate';
      o.innerHTML='<div class="authbox"><img src="'+LOGO+'" alt="KDEM"><h2>Startup Ecosystem Tracker</h2><p class="authsub">Karnataka Digital Economy Mission</p><input id="auth_email" type="email" placeholder="Work email" autocomplete="username"><input id="auth_pass" type="password" placeholder="Password" autocomplete="current-password"><button id="auth_btn">Sign in</button><div id="auth_msg"></div></div>';
      document.body.appendChild(o);
      document.getElementById('auth_btn').onclick=doLogin;
      document.getElementById('auth_pass').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
    }
    document.getElementById('auth_msg').textContent=msg||'';
    o.style.display='flex';
  }
  async function doLogin(){
    const email=document.getElementById('auth_email').value.trim();
    const pass=document.getElementById('auth_pass').value;
    document.getElementById('auth_msg').style.color='var(--muted)';
    document.getElementById('auth_msg').textContent='Signing in…';
    const {error}=await sb.auth.signInWithPassword({email:email,password:pass});
    if(error){document.getElementById('auth_msg').style.color='var(--bad)';document.getElementById('auth_msg').textContent=error.message;return;}
    location.reload();
  }

  const {data:{session}}=await sb.auth.getSession();
  if(!session){showLogin('');return;}

  let role='viewer';
  try{const {data}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();if(data&&data.role)role=data.role;}catch(e){}

  const email=session.user.email||'';
  const isAdmin=!!(window.__ADMIN_EMAIL && email.toLowerCase()===window.__ADMIN_EMAIL);
  const canWrite=isAdmin||role==='admin'||role==='editor';
  function mapErr(e){return {code:'invalid_argument',message:(e&&e.message)||'write failed'};}
  const userCap={
    async id(){return session.user.id;},
    async me(){return {name:(session.user.user_metadata&&session.user.user_metadata.full_name)||email};},
    isOwner(){return isAdmin;},
    canEdit(){return canWrite;},
    can(k){if(k==='data.write')return canWrite;return null;},
    async profiles(ids){const out={};try{const {data}=await sb.from('profiles').select('id,email').in('id',ids||[]);(data||[]).forEach(function(p){out[p.id]={name:p.email};});}catch(e){}return out;}
  };
  function docRef(id){return {
    async set(obj){const {error}=await sb.from('startups').upsert({id:id,data:obj,updated_at:new Date().toISOString(),updated_by:email});if(error)throw mapErr(error);},
    async delete(){await sb.from('startups').delete().eq('id',id);},
    async get(){const {data}=await sb.from('startups').select('data').eq('id',id).maybeSingle();return {exists:!!data,data:function(){return data&&data.data;}};}
  };}
  function configDoc(key){return {
    async get(){const {data}=await sb.from('config').select('data').eq('key',key).maybeSingle();return {exists:!!data,data:function(){return data&&data.data;},metadata:{}};},
    async set(obj){const {error}=await sb.from('config').upsert({key:key,data:obj});if(error)throw mapErr(error);}
  };}
  let deb=null;
  const dbCap={
    collection:function(path){return {
      onSnapshot:function(cb,err){
        const load=async function(){
          const {data,error}=await sb.from('startups').select('id,data').order('updated_at',{ascending:false}).limit(25000);
          if(error){if(err)err(mapErr(error));return;}
          cb({empty:(data||[]).length===0,docs:(data||[]).map(function(r){return {id:r.id,data:function(){return r.data;}};})});
        };
        load();
        const ch=sb.channel('st-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'startups'},function(){clearTimeout(deb);deb=setTimeout(load,400);}).subscribe();
        return function(){try{sb.removeChannel(ch);}catch(e){}};
      },
      doc:function(id){return docRef(id);}
    };},
    doc:function(path){const p=path.split('/');if(p[0]==='config')return configDoc(p[1]);return docRef(p[1]||p[0]);}
  };
  const downloadsCap={save:async function(o){try{const blob=new Blob([o.data],{type:'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=o.filename;document.body.appendChild(a);a.click();a.remove();return true;}catch(e){return false;}}};

  window.claude={use:async function(name){return name==='db'?dbCap:name==='user'?userCap:name==='downloads'?downloadsCap:null;}};

  window.__requestEmail=async function(to,subject,bodyHtml){
    const s=(await sb.auth.getSession()).data.session;
    const resp=await fetch('/api/email-request',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:JSON.stringify({to:to,subject:subject,bodyHtml:bodyHtml})});
    if(!resp.ok)throw new Error(await resp.text());return resp.json();
  };
  window.__signOut=async function(){await sb.auth.signOut();location.reload();};

  if(window.__startApp)window.__startApp();
  var so=document.getElementById('signoutBtn');if(so)so.onclick=window.__signOut;
})();
</script>
'''
SHIM = SHIM.replace('__LOGO__', logo)

tpl = tpl + '\n' + SHIM + '\n</body></html>'
tpl = HEAD + '\n' + tpl

open('/home/claude/kdem-app/index.html','w').write(tpl)
print('index.html bytes:', len(tpl))
