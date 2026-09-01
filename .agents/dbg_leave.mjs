const BASE="http://localhost:5173";
async function login(email){const r=await fetch(`${BASE}/api/v1/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:"LocalDev!23"})});return r.json();}
async function raw(email,path,body,method){const {accessToken}=await login(email);const opts={method:method||(body?"POST":"GET"),headers:{Authorization:`Bearer ${accessToken}`}};if(body){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(body);}const r=await fetch(`${BASE}/api/v1${path}`,opts);const t=await r.text();return {status:r.status,body:t};}
(async()=>{
  const d=new Date();const ymd=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  console.log("create aman leave:", JSON.stringify(await raw("chai@twm.local","/leave/managed",{employeeId:"emp-aman",leaveType:"casual",startDate:ymd,endDate:ymd,status:"approved",reason:"x"})));
  console.log("aman balances:", (await raw("chai@twm.local","/leave/balances?employeeId=emp-aman&year="+d.getFullYear())).body.slice(0,400));
  const org=JSON.parse((await raw("chai@twm.local","/employees/org")).body);
  const find=(nodes)=>nodes.flatMap(n=>[n,...(n.reports?.length?find(n.reports):[])]);
  const all=find(org.tree||[]);
  console.log("aman org status:", all.find(n=>n.id==="emp-aman")?.status, "| shreya:", all.find(n=>n.id==="emp-shreya")?.status);
})();
