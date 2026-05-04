const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json());

// ===== CORS FIX =====
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Content-Type,user,pass");
  res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ===== STATIC =====
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const DB = "data.json";

// ===== ADMIN LOGIN =====
const ADMIN_USER = "COBRA SERVER";
const ADMIN_PASS = "SAMI9166";

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

// ===== HASH =====
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
    return res.status(401).json({error:"Unauthorized"});
  }
}

// ===== ROOT =====
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"admin.html"));
});

// ===== GENERATE =====
app.post("/generate", auth,(req,res)=>{
  let { days, deviceLimit, customKey } = req.body;

  days = Number(days);
  deviceLimit = Number(deviceLimit) || 1;

  if(!days || days <= 0){
    return res.json({error:"invalid_days"});
  }

  let data = load();

  const key = customKey && customKey.trim()
    ? customKey.trim()
    : "COBRA-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  const newKey = {
    key,
    expiry: Date.now() + (days * 86400000),
    deviceLimit,
    devices: []
  };

  data.push(newKey);
  save(data);

  res.json({key});
});

// ===== CONNECT =====
app.post("/connect",(req,res)=>{
  const { key, deviceId } = req.body;

  if(!key) return res.json({status:"invalid"});

  let data = load();
  let user = data.find(u=>u.key === key.trim());

  if(!user) return res.json({status:"invalid"});
  if(Date.now() > user.expiry) return res.json({status:"expired"});

  const d = hash(deviceId || "unknown");

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

// ===== KEYS =====
app.get("/keys", auth,(req,res)=>{
  res.json(load());
});

// ===== DELETE =====
app.post("/delete", auth,(req,res)=>{
  const key = req.body.key;
  if(!key) return res.json({deleted:false});

  let data = load().filter(k=>k.key !== key);
  save(data);

  res.json({deleted:true});
});

// ===== RESET =====
app.post("/reset", auth,(req,res)=>{
  const key = req.body.key;

  let data = load();
  let u = data.find(x=>x.key === key);

  if(u){
    u.devices = [];
    save(data);
    return res.json({reset:true});
  }

  res.json({reset:false});
});

// ===== START =====
app.listen(PORT,()=>{
  console.log("🔥 COBRA PANEL RUNNING ON PORT", PORT);
});
