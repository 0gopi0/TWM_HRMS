const BASE = "http://localhost:5173";
const PASSWORD = "LocalDev!23";
async function login(email){const r=await fetch(`${BASE}/api/v1/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:PASSWORD})});return r.json();}
async function raw(email,path,body){const {accessToken}=await login(email);const opts={method:body?"POST":"GET",headers:{Authorization:`Bearer ${accessToken}`}};if(body){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(body);}const r=await fetch(`${BASE}/api/v1${path}`,opts);const t=await r.text();return {status:r.status,body:t};}
(async()=>{
  const T=new Date();const ymd=`${T.getFullYear()}-${String(T.getMonth()+1).padStart(2,"0")}-${String(T.getDate()).padStart(2,"0")}`;
  console.log("LEAVE create:", JSON.stringify(await raw("chai@twm.local","/leave/managed",{employeeId:"emp-aman",leaveType:"casual",startDate:ymd,endDate:ymd,status:"approved",reason:"demo"})));
  console.log("CLOCK naveen:", JSON.stringify(await raw("naveen@twm.local","/attendance/clock-in")));
  console.log("CLOCK gopi:", JSON.stringify(await raw("gopi@twm.local","/attendance/clock-in")));
  // read attendance/me for naveen to see clockedIn
  console.log("NAVEEN status:", JSON.stringify(await raw("naveen@twm.local","/attendance")));
})();
