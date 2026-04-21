import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ShoppingCart, Menu, X, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart';

interface ShopLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function ShopLayout({ children, title }: ShopLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const router = useRouter();

  return (
    <>
      <Head>
        <title>{title ? `${title} — Mailair Shop` : 'Mailair Shop'}</title>
      </Head>
      <div className="min-h-screen bg-slate-950">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link href="/shop" className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-white">Mail<span className="text-blue-400">air</span></span>
                  <span className="text-xs font-semibold text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">Shop</span>
                </Link>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-6">
                  <Link href="/shop" className="text-sm text-slate-300 hover:text-white transition-colors">All</Link>
                  <Link href="/shop?category=apparel" className="text-sm text-slate-300 hover:text-white transition-colors">Apparel</Link>
                  <Link href="/shop?category=accessories" className="text-sm text-slate-300 hover:text-white transition-colors">Accessories</Link>
                  <Link href="/shop?category=stationery" className="text-sm text-slate-300 hover:text-white transition-colors">Stationery</Link>
                </div>
                <Link href="/shop/cart" className="relative flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm font-medium text-white transition-all">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Cart</span>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <button className="md:hidden text-slate-400" onClick={() => setMobileOpen(!mobileOpen)}>
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
          {mobileOpen && (
            <div className="md:hidden border-t border-white/10 bg-slate-900/95 px-4 py-3 space-y-2">
              {['all', 'apparel', 'accessories', 'stationery'].map(cat => (
                <Link key={cat} href={cat === 'all' ? '/shop' : `/shop?category=${cat}`} onClick={() => setMobileOpen(false)}
                  className="block text-sm text-slate-300 py-1 capitalize">{cat}</Link>
              ))}
            </div>
          )}
        </nav>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 mt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Mailair. All designs original.</p>
            <div className="flex gap-6">
              <Link href="/shop" className="text-sm text-slate-500 hover:text-slate-300">Shop</Link>
              <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">Back to App</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
