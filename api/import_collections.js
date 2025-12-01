// This file goes in an 'api' folder in your project root (Vercel standard)
// Endpoint: /api/import_collections

export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shopUrl, accessToken, collections } = req.body;

  // 2. Validate Inputs
  if (!shopUrl || !accessToken || !collections || !Array.isArray(collections)) {
    return res
      .status(400)
      .json({ error: "Missing required fields or invalid JSON." });
  }

  // Clean the shop URL (remove https:// or trailing slashes)
  const cleanShopUrl = shopUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apiUrl = `https://${cleanShopUrl}/admin/api/2023-10/smart_collections.json`;

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // 3. Process Collections with Rate Limiting
  // Shopify allows ~2 requests/second on standard plans. We'll be safe with 500ms delays.

  for (const collection of collections) {
    // Sanitize the payload: Remove IDs if present (Shopify generates them)
    const { id, admin_graphql_api_id, ...validPayload } = collection;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ smart_collection: validPayload }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data.errors) || response.statusText);
      }

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        handle: collection.handle || "unknown",
        error: error.message,
      });
    }

    // Artificial delay to respect API limits (500ms)
    await new Promise((r) => setTimeout(r, 500));
  }

  // 4. Return Summary
  return res.status(200).json({
    message: "Import process completed",
    results,
  });
}
