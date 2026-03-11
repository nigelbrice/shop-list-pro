export async function lookupBarcode(barcode: string) {

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );

  const data = await res.json();

  if (data.status !== 1) return null;

  const product = data.product;

  return {
    name: product.product_name,
    image: product.image_front_url
  };
}