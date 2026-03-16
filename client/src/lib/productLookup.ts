export async function lookupBarcode(barcode: string) {

  // Use v2 API with fields param to keep response small.
  // User-Agent is required by Open Food Facts to identify the app
  // and avoid being rate-limited or blocked.
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,image_front_url`,
    {
      headers: {
        "User-Agent": "Shopeeze - Android/iOS PWA - contact@shopeeze.app",
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();

  if (data.status !== 1) return null;

  const product = data.product;

  // product_name can be empty string for some products
  const name = product.product_name?.trim() || null;
  if (!name) return null;

  return {
    name,
    image: product.image_front_url ?? null,
  };
}