// api/extract_collections.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Ensure URL has protocol and no trailing slash
    if (!url.startsWith("http")) url = `https://${url}`;
    url = url.replace(/\/$/, "");

    // Fetch public collections JSON
    const response = await fetch(`${url}/collections.json?limit=250`);

    if (!response.ok) throw new Error("Failed to fetch from store");

    const data = await response.json();

    // Format response
    const collections = data.collections.map((c) => ({
      title: c.title,
      handle: c.handle,
      url: `${url}/collections/${c.handle}`,
    }));

    res.status(200).json({ collections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
