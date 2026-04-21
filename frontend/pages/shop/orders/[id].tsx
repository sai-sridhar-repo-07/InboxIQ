import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import ShopLayout from '@/components/ShopLayout';
import { shopApi } from '@/lib/api';
import type { ShopOrder } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Payment Pending', color: 'text-amber-400' },
  paid: { label: 'Paid — Processing', color: 'text-green-400' },
  shipped: { label: 'Shipped', color: 'text-blue-400' },
  delivered: { label: 'Delivered', color: 'text-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-400' },
};

export default function OrderConfirmationPage() {
  const router = useRouter();
  const { id, email } = router.query;
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id || !email) return;
    shopApi.getOrder(id as string, email as string)
      .then(setOrder)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, email]);

  if (loading) return (
    <ShopLayout title="Order Confirmation">
      <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 text-slate-500 animate-spin" /></div>
    </ShopLayout>
  );

  if (error || !order) return (
    <ShopLayout title="Order Not Found">
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-white/10 mb-4">
          <Package className="h-7 w-7 text-slate-500" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Order not found</p>
        <p className="text-slate-500 text-sm mb-2">We couldn't find this order. A confirmation email was sent — check your inbox.</p>
        <p className="text-slate-600 text-xs mb-6">If you just paid, it may take a few seconds. Try refreshing.</p>
        <div className="flex gap-3">
          <button onClick={() => router.reload()} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors">
            Refresh
          </button>
          <Link href="/shop" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl px-5 py-2.5 text-sm transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    </ShopLayout>
  );

  const status = STATUS_LABEL[order.status] || { label: order.status, color: 'text-slate-400' };

  return (
    <ShopLayout title="Order Confirmed">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Order Confirmed!</h1>
          <p className="text-slate-400 text-sm">Thanks {order.customer_name}! A confirmation email is on its way.</p>
        </div>

        {/* Order details */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Order ID</p>
              <p className="text-sm font-mono text-white mt-0.5">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">
                  {item.product_name}
                  {item.variant ? <span className="text-slate-500"> — {item.variant}</span> : null}
                  {item.customization ? <span className="text-violet-400"> — {item.customization}</span> : null}
                  <span className="text-slate-500"> ×{item.quantity}</span>
                </span>
                <span className="text-white font-medium">₹{(item.unit_price * item.quantity / 100).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-3 flex justify-between">
            <span className="font-semibold text-white">Total Paid</span>
            <span className="text-xl font-bold text-blue-400">₹{(order.total_paise / 100).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Shipping address */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shipping To</p>
          <div className="text-sm text-slate-300 space-y-0.5">
            <p className="font-semibold text-white">{order.shipping_address.name}</p>
            <p>{order.shipping_address.line1}</p>
            {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
            <p>{order.shipping_address.city}, {order.shipping_address.state} — {order.shipping_address.pincode}</p>
            <p className="text-slate-400">{order.shipping_address.phone}</p>
          </div>
        </div>

        <div className="text-center space-y-3 pb-8">
          <p className="text-xs text-slate-500">Ships within 3-5 business days. Questions? Reply to your confirmation email.</p>
          <Link href="/shop" className="inline-block bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white font-medium rounded-xl px-6 py-2.5 transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    </ShopLayout>
  );
}
