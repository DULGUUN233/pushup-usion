// Railway дээр index.html-ийг гаргах хамгийн жижиг static сервер. Хамаарал байхгүй.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "index.html"));

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(page);
}).listen(process.env.PORT || 8080, "0.0.0.0");
