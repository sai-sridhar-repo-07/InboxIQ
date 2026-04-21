import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ShoppingCart, Loader2, ChevronLeft, ChevronRight, Package } from 'lucide-react';
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
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    shopApi.getProduct(id as string)
      .then(p => { setProduct(p); if (p.variants?.length) setSelectedVariant(p.variants[0].name); })
      .catch(() => router.replace('/shop'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    if (product.variants?.length && !selectedVariant) return toast.error('Pick a variant');
    if (product.allows_custom && !customText.trim()) return toast.error(`Enter ${product.custom_label}`);
    addItem({
      product_id: product.id,
      product_name: product.name,
      variant: selectedVariant,
      unit_price: product.price_paise,
      image: product.images[0] || null,
      customization: product.allows_custom ? customText.trim() : null,
      quantity: qty,
    });
    toast.success('Added to cart!');
  };

  if (loading) return (
    <ShopLayout>
      <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 text-slate-500 animate-spin" /></div>
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
