const BASE="http://localhost:5173";
async function login(email){const r=await fetch(`${BASE}/api/v1/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:"LocalDev!23"})});return r.json();}
async function raw(email,path){const {accessToken}=await login(email);const r=await fetch(`${BASE}/api/v1${path}`,{headers:{Authorization:`Bearer ${accessToken}`}});return r.text();}
(async()=>{
  const rowsJson=await raw("chai@twm.local","/leave?pageSize=100");
  const rows=JSON.parse(rowsJson);
  const data=rows.data||[];
  const aman=data.filter(r=>r.employeeId==="emp-aman");
  console.log("Aman leave rows:", JSON.stringify(aman, null, 2));
  console.log("--- row keys sample:", Object.keys(data[0]||{}));
})();
