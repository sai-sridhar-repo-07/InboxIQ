import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ShoppingCart, Loader2, ChevronLeft, ChevronRight, Package, ArrowLeft, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import ShopLayout from '@/components/ShopLayout';
import { shopApi } from '@/lib/api';
import { useCart } from '@/lib/cart';
import type { ShopProduct } from '@/lib/types';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const { addItem } = useCart();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setFetchError(false);
    shopApi.getProduct(id as string)
      .then(p => { setProduct(p); if (p.variants?.length) setSelectedVariant(p.variants[0].name); })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) setNotFound(true);
        else setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    if (product.variants?.length && !selectedVariant) return toast.error('Please select a variant');
    if (product.allows_custom && !customText.trim()) return toast.error(`Please enter ${product.custom_label}`);
    addItem({
      product_id: product.id,
      product_name: product.name,
      variant: selectedVariant,
      unit_price: product.price_paise,
      image: product.images[0] || null,
      customization: product.allows_custom ? customText.trim() : null,
      quantity: qty,
    });
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) return (
    <ShopLayout>
      <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 text-slate-500 animate-spin" /></div>
    </ShopLayout>
  );

  if (notFound) return (
    <ShopLayout title="Product Not Found">
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-white/10 mb-4">
          <Package className="h-7 w-7 text-slate-500" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Product not found</p>
        <p className="text-slate-500 text-sm mb-6">This item may have been removed or is no longer available.</p>
        <Link href="/shop" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 py-3 transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Browse Shop
        </Link>
      </div>
    </ShopLayout>
  );

  if (fetchError) return (
    <ShopLayout title="Error">
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
          <WifiOff className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Something went wrong</p>
        <p className="text-slate-500 text-sm mb-6">Couldn't load this product. Check your connection.</p>
        <div className="flex gap-3">
          <button onClick={() => { setFetchError(false); setLoading(true); shopApi.getProduct(id as string).then(p => { setProduct(p); if (p.variants?.length) setSelectedVariant(p.variants[0].name); }).catch((err) => { if (err?.response?.status === 404) setNotFound(true); else setFetchError(true); }).finally(() => setLoading(false)); }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors">
            Try Again
          </button>
          <Link href="/shop" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl px-5 py-2.5 text-sm transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    </ShopLayout>
  );

  if (!product) return null;

  const images = product.images.length ? product.images : [];

  return (
    <ShopLayout title={product.name}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-white/5 relative">
            {images[imgIdx] ? (
              <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-16 w-16 text-slate-600" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === imgIdx ? 'border-blue-500' : 'border-white/10'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 capitalize border border-slate-700 rounded-full px-2 py-0.5">{product.category}</span>
              {product.allows_custom && <span className="text-xs text-violet-400 border border-violet-500/30 rounded-full px-2 py-0.5">Customizable</span>}
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">{product.name}</h1>
            <p className="text-3xl font-bold text-blue-400">₹{product.price.toLocaleString('en-IN')}</p>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed">{product.description}</p>

          {product.variants?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Variant</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button key={v.name} onClick={() => setSelectedVariant(v.name)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      selectedVariant === v.name
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.allows_custom && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">{product.custom_label}</label>
              <input
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder={`Enter ${product.custom_label.toLowerCase()}`}
                maxLength={50}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 border border-white/10 rounded-xl px-3 py-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-slate-400 hover:text-white w-6 h-6 flex items-center justify-center">−</button>
              <span className="text-white font-semibold w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="text-slate-400 hover:text-white w-6 h-6 flex items-center justify-center">+</button>
            </div>
            <button onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 transition-colors">
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          </div>

          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {product.tags.map(t => (
                <span key={t} className="text-xs text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">{t}</span>
              ))}
            </div>
          )}

          <div className="border-t border-white/5 pt-4 space-y-2 text-xs text-slate-500">
            <p>Ships within 3-5 business days</p>
            <p>Free shipping on orders above ₹999</p>
            <p>100% original Mailair designs</p>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
