const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = 3000;
const DB = "data.json";

// ===== Load Data =====
function loadData() {
  if (!fs.existsSync(DB)) return [];
  return JSON.parse(fs.readFileSync(DB));
}

// ===== Save Data =====
function saveData(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
  res.send("Cobra Panel Server Running ✅");
});

// ===== BASIC GENERATE KEY (test) =====
app.get("/test-generate", (req, res) => {
  let data = loadData();

  const newKey = {
    key: "TEST-" + Math.random().toString(36).substr(2, 6),
    created: Date.now()
  };

  data.push(newKey);
  saveData(data);

  res.json(newKey);
});

// ===== VIEW ALL KEYS =====
app.get("/keys", (req, res) => {
  res.json(loadData());
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
