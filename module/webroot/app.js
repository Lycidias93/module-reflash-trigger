async function execShell(cmd) {
  if (window.ksu && typeof window.ksu.exec === 'function') return await window.ksu.exec(cmd);
  if (window.kernelsu && typeof window.kernelsu.exec === 'function') return await window.kernelsu.exec(cmd);
  if (window.webui && typeof window.webui.exec === 'function') return await window.webui.exec(cmd);
  throw new Error('No supported WebUI shell bridge found. Use CLI: /data/adb/modules/module-reflash-trigger/bin/mrt');
}
function outText(res){ if(typeof res==='string') return res; if(res&&res.stdout) return res.stdout; return JSON.stringify(res,null,2); }
function setStatus(t){ document.getElementById('status').textContent=t; }
function shellQuote(s){ return "'" + String(s).replace(/'/g,"'\''") + "'"; }
async function scan(online){
  setStatus('Scanning...');
  const cmd='/data/adb/modules/module-reflash-trigger/bin/mrt '+(online?'scan-online-json':'scan-json');
  try{
    const res=await execShell(cmd); const txt=outText(res).trim(); document.getElementById('raw').textContent=txt;
    let arr=JSON.parse(txt); render(arr); setStatus('Scan done: '+arr.length+' modules');
  }catch(e){ setStatus('Scan failed: '+e.message); }
}
function render(arr){
  const root=document.getElementById('modules'); root.innerHTML='';
  arr.forEach(m=>{
    const div=document.createElement('div'); div.className='card';
    const badgeClass=m.status==='fresh'?'ok':(m.needs_reflash?'danger':(m.status==='reflash_baseline_unknown'?'warn':''));
    div.innerHTML=`<h2>${m.name || m.id}</h2>
      <span class="badge ${badgeClass}">${m.status}</span>
      <span class="badge">triggerable=${m.triggerable}</span>
      <span class="badge">needs=${m.needs_reflash}</span>
      <div class="meta">id=${m.id}
local=${m.version} / ${m.versionCode}
remote=${m.remoteVersion || ''} / ${m.remoteCode || ''}
reason=${m.reason}
updateJson=${m.updateJson}</div>
      <div class="row"></div>`;
    const row=div.querySelector('.row');
    const trig=document.createElement('button'); trig.textContent='Trigger reflash'; trig.disabled=!m.triggerable; trig.onclick=()=>run('/data/adb/modules/module-reflash-trigger/bin/mrt trigger --yes '+shellQuote(m.id)); row.appendChild(trig);
    const fresh=document.createElement('button'); fresh.textContent='Mark fresh'; fresh.onclick=()=>run('/data/adb/modules/module-reflash-trigger/bin/mrt mark-fresh '+shellQuote(m.id)); row.appendChild(fresh);
    const restore=document.createElement('button'); restore.textContent='Restore latest'; restore.onclick=()=>run('/data/adb/modules/module-reflash-trigger/bin/mrt restore-latest '+shellQuote(m.id)); row.appendChild(restore);
    const base=document.createElement('button'); base.textContent='Baseline'; base.onclick=()=>run('/data/adb/modules/module-reflash-trigger/bin/mrt baseline-show --online '+shellQuote(m.id)); row.appendChild(base);
    root.appendChild(div);
  });
}
async function run(cmd){
  setStatus('Running...');
  try{ const res=await execShell(cmd); document.getElementById('raw').textContent=outText(res); setStatus('Done'); }
  catch(e){ setStatus('Failed: '+e.message); }
}
document.getElementById('scan').onclick=()=>scan(true);
document.getElementById('scanOffline').onclick=()=>scan(false);
document.getElementById('auto').onclick=()=>run('/data/adb/modules/module-reflash-trigger/bin/mrt auto-trigger --dry-run');
document.getElementById('needsDry').onclick=()=>run('/data/adb/modules/module-reflash-trigger/bin/mrt trigger-needed --dry-run --mode marker');
document.getElementById('needsTrigger').onclick=()=>{ if(confirm('Trigger all manager-reported Needs reflash modules? This lowers their local versionCode so your root/module manager can run the normal online reflash. It will not download or install ZIPs.')) run('/data/adb/modules/module-reflash-trigger/bin/mrt trigger-needed --yes --mode marker'); };
scan(false);
