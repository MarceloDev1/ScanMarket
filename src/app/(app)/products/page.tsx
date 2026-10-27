import { PageHeader } from "@/components/page-header";
import { ProductList } from "@/components/product-list";
import { getProducts } from "@/lib/queries";

export const metadata = { title: "Preços · PricePulse" };

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <PageHeader title="Preços" subtitle="Escolha um produto para ver a evolução" />
      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Os produtos aparecem aqui depois que você escanear sua primeira nota.
        </p>
      ) : (
        <ProductList products={products} />
      )}
    </>
  );
}
