// Railway дээр index.html-ийг гаргах хамгийн жижиг static сервер. Хамаарал байхгүй.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "index.html");

// Хүсэлт бүрт уншина — эс тэгвээс засвар хийсний дараа сервер хуучин
// хувилбараа өгсөөр байдаг.
http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(fs.readFileSync(file));
}).listen(process.env.PORT || 8080, "0.0.0.0");
