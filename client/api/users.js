export default async function handler(req, res) {
  // Simple test response
  return res.json({ message: "API endpoint working", method: req.method, query: req.query });
}
