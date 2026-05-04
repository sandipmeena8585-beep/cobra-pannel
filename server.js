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

// ===== STATIC =====
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const DB = "data.json";

// ===== ADMIN LOGIN =====
const ADMIN_USER = "COBRA SERVER";
const ADMIN_PASS = "SAMI9166";

// ===== PLAN MAP =====
const PLAN = {
  "1H": 1/24,
  "3H": 3/24,
  "5H": 5/24,
  "12H": 12/24,
  "1DAY": 1,
  "7DAY": 7,
  "15DAY": 15,
  "30DAY": 30,
  "60DAY": 60
};

// ===== LOAD =====
function load(){
  try{
    if(!fs.existsSync(DB)) return [];
    const raw = fs.readFileSync(DB);
    return raw.length ? JSON.parse(raw) : [];
  }catch{
    return [];
  }
}

// ===== SAVE =====
function save(data){
  fs.writeFileSync(DB, JSON.stringify(data,null,2));
}

// ===== HASH DEVICE =====
function hash(id){
  return crypto.createHash("sha256").update(String(id)).digest("hex");
}

// ===== AUTH =====
function auth(req,res,next){
  const user = (req.headers.user || "").trim();
  const pass = (req.headers.pass || "").trim();

  if(user === ADMIN_USER && pass === ADMIN_PASS){
    next();
  } else {
    res.status(401).json({error:"Unauthorized"});
  }
}

// ===== ROOT =====
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"admin.html"));
});

// ===== GENERATE KEY =====
app.post("/generate", auth,(req,res)=>{
  let { plan, deviceLimit, customKey } = req.body;

  let days = PLAN[plan];
  if(!days) return res.json({error:"invalid_plan"});

  deviceLimit = Number(deviceLimit) || 1;

  let data = load();

  const key = customKey && customKey.trim() !== ""
    ? customKey.trim()
    : "COBRA-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  data.push({
    key,
    expiry: Date.now() + (days * 86400000),
    deviceLimit,
    devices: []
  });

  save(data);
  res.json({key});
});

// ===== CONNECT (MOD USE) =====
app.post("/connect",(req,res)=>{
  const { key, deviceId } = req.body;

  if(!key) return res.json({status:"invalid"});

  let data = load();
  let user = data.find(u => u.key === key.trim());

  if(!user) return res.json({status:"invalid"});
  if(Date.now() > user.expiry) return res.json({status:"expired"});

  const d = hash(deviceId || "unknown");

  // 🔒 DEVICE LOCK
  if(!user.devices.includes(d)){
    if(user.devices.length >= user.deviceLimit){
      return res.json({status:"limit"});
    }
    user.devices.push(d);
    save(data);
  }

  res.json({
    status:"ok",
    url:"https://cobraserver.ai-new.xyz/server"
  });
});

// ===== GET KEYS =====
app.get("/keys", auth,(req,res)=>{
  res.json(load());
});

// ===== DELETE KEY =====
app.post("/delete", auth,(req,res)=>{
  const key = req.body.key;
  if(!key) return res.json({deleted:false});

  let data = load().filter(k => k.key !== key);
  save(data);

  res.json({deleted:true});
});

// ===== RESET DEVICE =====
app.post("/reset", auth,(req,res)=>{
  let data = load();
  let u = data.find(x => x.key === req.body.key);

  if(u){
    u.devices = [];
    save(data);
    return res.json({reset:true});
  }

  res.json({reset:false});
});

// ===== EXTEND KEY =====
app.post("/extend", auth,(req,res)=>{
  let { key, days } = req.body;

  let data = load();
  let u = data.find(x => x.key === key);

  if(u){
    u.expiry += Number(days || 7) * 86400000;
    save(data);
    return res.json({extended:true});
  }

  res.json({extended:false});
});

// ===== START =====
app.listen(PORT,()=>{
  console.log("🔥 COBRA PANEL RUNNING ON PORT", PORT);
});
