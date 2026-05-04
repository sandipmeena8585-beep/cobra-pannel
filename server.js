const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json());

// ===== CORS =====
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Content-Type,user,pass");
  res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const DB = "data.json";

const ADMIN_USER = "COBRA SERVER";
const ADMIN_PASS = "SAMI9166";

// ===== LOAD/SAVE =====
function load(){
  try{
    if(!fs.existsSync(DB)) return [];
    return JSON.parse(fs.readFileSync(DB));
  }catch{
    return [];
  }
}
function save(d){
  fs.writeFileSync(DB,JSON.stringify(d,null,2));
}

function hash(id){
  return crypto.createHash("sha256").update(String(id)).digest("hex");
}

// ===== AUTH =====
function auth(req,res,next){
  if(
    (req.headers.user||"").trim()===ADMIN_USER &&
    (req.headers.pass||"").trim()===ADMIN_PASS
  ){
    next();
  } else {
    res.status(401).json({error:"unauthorized"});
  }
}

// ===== PLAN MAP =====
const PLAN = {
  "1H":1/24,
  "3H":3/24,
  "5H":5/24,
  "12H":12/24,
  "1DAY":1,
  "7DAY":7,
  "15DAY":15,
  "30DAY":30,
  "60DAY":60
};

// ===== ROOT =====
app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"admin.html"));
});

// ===== GENERATE =====
app.post("/generate",auth,(req,res)=>{
  let {plan,deviceLimit,customKey} = req.body;

  let days = PLAN[plan];
  if(!days) return res.json({error:"plan"});

  deviceLimit = Number(deviceLimit)||1;

  let data = load();

  const key = customKey?.trim()
    ? customKey.trim()
    : "COBRA-"+crypto.randomBytes(4).toString("hex").toUpperCase();

  data.push({
    key,
    expiry:Date.now()+(days*86400000),
    deviceLimit,
    devices:[]
  });

  save(data);
  res.json({key});
});

// ===== CONNECT =====
app.post("/connect",(req,res)=>{
  const {key,deviceId} = req.body;

  let data = load();
  let u = data.find(x=>x.key===key);

  if(!u) return res.json({status:"invalid"});
  if(Date.now()>u.expiry) return res.json({status:"expired"});

  const d = hash(deviceId);

  if(!u.devices.includes(d)){
    if(u.devices.length>=u.deviceLimit){
      return res.json({status:"limit"});
    }
    u.devices.push(d);
    save(data);
  }

  res.json({
    status:"ok",
    url:"https://cobraserver.ai-new.xyz/server"
  });
});

// ===== KEYS =====
app.get("/keys",auth,(req,res)=>{
  res.json(load());
});

// ===== DELETE =====
app.post("/delete",auth,(req,res)=>{
  save(load().filter(k=>k.key!==req.body.key));
  res.json({ok:true});
});

// ===== RESET =====
app.post("/reset",auth,(req,res)=>{
  let data=load();
  let u=data.find(x=>x.key===req.body.key);
  if(u){u.devices=[];save(data);}
  res.json({ok:true});
});

// ===== EXTEND =====
app.post("/extend",auth,(req,res)=>{
  let {key,days}=req.body;
  let data=load();
  let u=data.find(x=>x.key===key);
  if(u){
    u.expiry+=Number(days)*86400000;
    save(data);
  }
  res.json({ok:true});
});

app.listen(PORT,()=>console.log("🔥 RUNNING"));
