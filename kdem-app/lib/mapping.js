// Column auto-matching + de-duplication, shared by the Google-Form webhook.
// Mirrors the logic in the browser importer so forms and manual imports behave the same.

const CLUSTERS = ['Bengaluru Urban','H-D-B Cluster','Mangaluru Cluster','Mysuru Cluster','Shivamogga Cluster','Kalaburagi Cluster','Tumakuru Cluster'];
const DKEY = [['hubbal','H-D-B Cluster'],['hubli','H-D-B Cluster'],['belagavi','H-D-B Cluster'],['belgaum','H-D-B Cluster'],['dharwad','H-D-B Cluster'],['gadag','H-D-B Cluster'],['haveri','H-D-B Cluster'],['bagalkot','H-D-B Cluster'],['mangal','Mangaluru Cluster'],['dakshina kannada','Mangaluru Cluster'],['udupi','Mangaluru Cluster'],['uttara kannada','Mangaluru Cluster'],['karwar','Mangaluru Cluster'],['kodagu','Mangaluru Cluster'],['madikeri','Mangaluru Cluster'],['puttur','Mangaluru Cluster'],['mysur','Mysuru Cluster'],['mysore','Mysuru Cluster'],['mandya','Mysuru Cluster'],['ramanagar','Mysuru Cluster'],['chamarajanagar','Mysuru Cluster'],['shivamogga','Shivamogga Cluster'],['shimoga','Shivamogga Cluster'],['davanagere','Shivamogga Cluster'],['davangere','Shivamogga Cluster'],['chikkamagalur','Shivamogga Cluster'],['chikmagalur','Shivamogga Cluster'],['hassan','Shivamogga Cluster'],['bidar','Kalaburagi Cluster'],['kalaburagi','Kalaburagi Cluster'],['gulbarga','Kalaburagi Cluster'],['koppal','Kalaburagi Cluster'],['raichur','Kalaburagi Cluster'],['yadgir','Kalaburagi Cluster'],['vijayanagara','Kalaburagi Cluster'],['vijayapura','Kalaburagi Cluster'],['bijapur','Kalaburagi Cluster'],['ballari','Kalaburagi Cluster'],['bellary','Kalaburagi Cluster'],['tumakuru','Tumakuru Cluster'],['tumkur','Tumakuru Cluster'],['chitradurga','Tumakuru Cluster'],['chikkaballapur','Tumakuru Cluster'],['bengaluru rural','Tumakuru Cluster'],['kolar','Tumakuru Cluster']];
function toCluster(d){const s=(d||'').toLowerCase();for(const [k,v] of DKEY) if(s.includes(k)) return v;return 'Bengaluru Urban';}

const STOP = new Set(['private','limited','pvt','ltd','llp','the','and','technologies','technology','solutions','solution','services','india','labs','ventures','innovations','innovation','enterprises','company','co','systems']);
function norm(n){return (n||'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(privatelimited|pvtltd|pvtlimited|privateltd|llp|ltd)$/,'');}
function tokens(n){return new Set((n||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(t=>t.length>1 && !STOP.has(t)));}
function simNames(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(t=>{if(B.has(t))i++;});return i/(A.size+B.size-i);}

const FIELDS = [
 {k:'id',syn:['startup id','record id','tracker id']},
 {k:'name',syn:['startup name','name of startup','company name','organisation name','organization name','startup']},
 {k:'founder',syn:['founder','co-founder','point of contact','primary contact','contact name','contact person','founder name','poc','promoter','director']},
 {k:'email',syn:['email address','official email','registered email','email id','contact email','email','mail']},
 {k:'phone',syn:['contact number','phone number','mobile number','whatsapp','mobile','phone','number']},
 {k:'website',syn:['website','url','web site','site']},
 {k:'linkedin',syn:['linkedin','linked in','linkedin url']},
 {k:'source',syn:['source of contact','source']},
 {k:'cohort',syn:['cohort','batch']},
 {k:'subSector',syn:['sub-sector','sub sector','subsector']},
 {k:'yearFounded',syn:['year founded','founded','year of incorporation','incorporation year']},
 {k:'companyProfile',syn:['company profile','about the startup','about','description','overview']},
 {k:'product',syn:['product / service','product service','product','service']},
 {k:'offering',syn:['offering / customer focus','offering customer focus','offering','customer focus']},
 {k:'trl',syn:['technology readiness level trl','technology readiness level','trl']},
 {k:'teamStrength',syn:['team strength','team size','employees','headcount']},
 {k:'kitsActionNeeded',syn:['action needed from kits','kits action needed']},
 {k:'kitsStatus',syn:['kits status']},
 {k:'kitsResponse',syn:['kits response / reply','kits response reply','kits response','kits reply']},
 {k:'kitsActionTaken',syn:['kits action taken']},
 {k:'district',syn:['location / district','location district','district / city','district','city','location','place','taluk']},
 {k:'sector',syn:['industry / sector','industry sector','industry','sector','domain']},
 {k:'stage',syn:['current stage','startup stage','stage of startup','stage']},
 {k:'dpiit',syn:['dpiit recognised','dpiit recognized','is your startup dpiit','dpiit']},
 {k:'dpiitNo',syn:['dpiit recognition number','dpiit number','dpiit no']},
 {k:'skReg',syn:['registered on startup karnataka','startup karnataka registration','have you registered','sk registered','kits registration status','registration status','registered with startup karnataka']},
 {k:'kitsNo',syn:['kits registration number','startup karnataka registration no','sk registration number','kits number','registration no']},
 {k:'appliedSK',syn:['applied for startup karnataka registration','applied for sk registration','applied on portal']},
 {k:'fiApplied',syn:['fiscal incentive applied','applied for fiscal incentive','incentive applied','have you applied for any fiscal']},
 {k:'incentives',syn:['incentives availed','incentive availed','already availed','availed','which fiscal incentive','which incentive did you']},
 {k:'planning',syn:['planning to apply','wish to avail','plan to apply','incentives planning']},
 {k:'appStage',syn:['application stage','status of your application','current status of application','status of application']},
 {k:'aware',syn:['aware of available incentives','aware of incentives','aware']},
 {k:'reason',syn:['reason for not applying','reason not applied','challenge faced','biggest challenge','main reasons','why not registered']},
 {k:'support',syn:['support required','support needed','help required','assistance']},
 {k:'event',syn:['event','meeting','source of contact','source','program','session']},
 {k:'met',syn:['founder met in person','met in person','met founder','met']},
 {k:'consent',syn:['consent to contact','may contact','representative contact','reach out']},
 {k:'notes',syn:['action notes','notes / remarks','remarks','notes','comments','additional details']},
];
function normH(s){return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function guessField(header){
  const h=normH(header);if(!h)return '';
  for(const f of FIELDS){if(f.syn.some(s=>h===s))return f.k;}
  let best='',len=0;
  for(const f of FIELDS)for(const s of f.syn){if((h.includes(s)||s.includes(h))&&s.length>len){best=f.k;len=s.length;}}
  return best;
}
function yn(v){v=String(v||'').toLowerCase();return v.startsWith('y')?'Yes':'No';}
function fiv(v){v=String(v||'').toLowerCase();if(v.startsWith('y'))return 'Yes';if(v.includes('plan'))return 'Planning to Apply';if(v.includes('not elig'))return 'Not Eligible';return 'No';}
function skv(v){v=String(v||'').toLowerCase();if(v.startsWith('yes')||v.includes('already'))return 'Yes';if(v.includes('prog')||v.includes('awaiting')||v.includes('applied'))return 'In Progress';if(v.includes('aware'))return 'No - Not Aware';return 'No';}
const INCMAP=[['state gst','State GST'],['internship','Internship'],['patent','Patent'],['pf','PF/ESI'],['esi','PF/ESI'],['r&d','R&D Grant'],['research','R&D Grant'],['cloud','Cloud Storage'],['quality','Quality Cert.'],['marketing','Marketing']];
function matchIncentive(x){const s=String(x).toLowerCase();for(const [k,v] of INCMAP) if(s.includes(k)) return v;return '';}

// Turn a {question: answer} object from a Google Form into a startup record.
function mapAnswers(answers) {
  const rec = {};
  for (const q in answers) {
    const k = guessField(q);
    const v = String(answers[q] == null ? '' : answers[q]).trim();
    if (k && v && !rec[k]) rec[k] = v;
  }
  if (rec.dpiit != null) rec.dpiit = yn(rec.dpiit);
  if (rec.met != null) rec.met = yn(rec.met);
  if (rec.consent != null) rec.consent = yn(rec.consent);
  if (rec.aware != null) rec.aware = yn(rec.aware);
  if (rec.appliedSK != null) rec.appliedSK = yn(rec.appliedSK);
  if (rec.fiApplied != null) rec.fiApplied = fiv(rec.fiApplied);
  if (rec.skReg != null) rec.skReg = skv(rec.skReg);
  if (rec.incentives != null) rec.incentives = String(rec.incentives).split(/[,;]+/).map(matchIncentive).filter(Boolean);
  rec.cluster = toCluster(rec.district || '');
  return rec;
}

function blankStartup() {
  return { id:'', name:'', date:new Date().toISOString().slice(0,10), source:'Google Form', founders:[{name:'',email:'',phone:''}],
    email:'', phone:'', met:'No', event:'', sector:'', stage:'', district:'', cluster:'Bengaluru Urban',
    dpiit:'No', dpiitNo:'', skReg:'No', kitsNo:'', appliedSK:'No', appSKdate:'', kitsConfReg:'',
    fiApplied:'No', fiDate:'', incentives:[], kitsConfInc:'', planning:'', appStage:'Not Applied', aware:'No',
    reason:'', support:'', action:'', notes:'', priority:'Medium', fuReq:'No', fuDate:'', consent:'Yes',
    kitsActionNeeded:'', kitsStatus:'', kitsResponse:'', kitsActionTaken:'', website:'', linkedin:'', cohort:'', subSector:'', yearFounded:'', companyProfile:'', product:'', offering:'', trl:'', teamStrength:'', extra:{}, history:[], remarks:[] };
}

module.exports = { toCluster, norm, simNames, mapAnswers, blankStartup, CLUSTERS };
