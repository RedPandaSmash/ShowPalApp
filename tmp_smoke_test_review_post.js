const http = require("http");

const data = JSON.stringify({
  showID: "test-show",
  rating: 5,
  comment: "smoke test",
});

const options = {
  hostname: "localhost",
  port: 8080,
  path: "/api/reviews",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log("Status:", res.statusCode);
  res.setEncoding("utf8");
  res.on("data", (chunk) => console.log("Body:", chunk));
});

req.on("error", (e) => {
  console.error("Request error", e);
});

req.write(data);
req.end();
