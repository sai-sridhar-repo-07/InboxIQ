import hashlib
import hmac
import logging
from typing import Optional

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from config import settings
from database import get_supabase
from middleware.auth import get_current_user
from services.newsletter_service import send_resend_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/shop", tags=["shop"])


def _rz():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


# ─── Products ─────────────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(category: Optional[str] = None):
    supabase = get_supabase()
    q = supabase.table("shop_products").select("*").eq("available", True).order("created_at", desc=True)
    if category:
        q = q.eq("category", category)
    result = q.execute()
    return {"products": result.data or []}


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    supabase = get_supabase()
    result = supabase.table("shop_products").select("*").eq("id", product_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return result.data


# ─── Orders ───────────────────────────────────────────────────────────────────

class OrderItem(BaseModel):
    product_id: str
    variant: Optional[str] = None        # "S / Black", "M / White", etc.
    quantity: int = 1
    unit_price: int                       # paise (INR × 100)
    customization: Optional[str] = None  # custom text/name


class ShippingAddress(BaseModel):
    name: str
    email: EmailStr
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str


class CreateOrderBody(BaseModel):
    items: list[OrderItem]
    shipping: ShippingAddress
    notes: Optional[str] = None


@router.post("/orders")
async def create_order(body: CreateOrderBody):
    """Create a Razorpay order for shop checkout. No auth required — public checkout."""
    if not body.items:
        raise HTTPException(status_code=400, detail="No items in order")

    total_paise = sum(item.unit_price * item.quantity for item in body.items)
    if total_paise < 100:
        raise HTTPException(status_code=400, detail="Order total too low")

    supabase = get_supabase()

    # Validate all products exist
    product_ids = [i.product_id for i in body.items]
    products = supabase.table("shop_products").select("id, name, price, available").in_("id", product_ids).execute()
    products_map = {p["id"]: p for p in (products.data or [])}
    for item in body.items:
        p = products_map.get(item.product_id)
        if not p or not p.get("available"):
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} unavailable")

    # Create Razorpay order
    try:
        rz_order = _rz().order.create({
            "amount": total_paise,
            "currency": "INR",
            "receipt": f"shop_{body.shipping.email[:20]}",
            "notes": {"customer": body.shipping.name, "email": body.shipping.email},
        })
    except Exception as exc:
        logger.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Payment gateway error")

    # Save order in DB
    items_payload = [
        {
            "product_id": item.product_id,
            "product_name": products_map[item.product_id]["name"],
            "variant": item.variant,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "customization": item.customization,
        }
        for item in body.items
    ]

    db_order = supabase.table("shop_orders").insert({
        "customer_email": body.shipping.email,
        "customer_name": body.shipping.name,
        "customer_phone": body.shipping.phone,
        "items": items_payload,
        "total_paise": total_paise,
        "shipping_address": body.shipping.model_dump(),
        "notes": body.notes,
        "razorpay_order_id": rz_order["id"],
        "status": "pending",
    }).execute()

    order_id = db_order.data[0]["id"] if db_order.data else None

    return {
        "order_id": order_id,
        "razorpay_order_id": rz_order["id"],
        "amount": total_paise,
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID,
        "customer_name": body.shipping.name,
        "customer_email": body.shipping.email,
        "customer_phone": body.shipping.phone,
    }


class VerifyPaymentBody(BaseModel):
    order_id: str              # our DB order id
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/orders/verify")
async def verify_payment(body: VerifyPaymentBody):
    """Verify Razorpay payment signature and mark order as paid."""
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    supabase = get_supabase()
    result = supabase.table("shop_orders").update({
        "status": "paid",
        "razorpay_payment_id": body.razorpay_payment_id,
        "razorpay_signature": body.razorpay_signature,
    }).eq("id", body.order_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = result.data[0]

    # Send confirmation email
    await _send_order_confirmation(order)

    return {"status": "paid", "order_id": body.order_id}


async def _send_order_confirmation(order: dict):
    items_html = "".join(
        f"<tr><td style='padding:8px;border-bottom:1px solid #1e293b'>{i.get('product_name','')}"
        f"{' — ' + i['variant'] if i.get('variant') else ''}"
        f"{' — Custom: ' + i['customization'] if i.get('customization') else ''}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #1e293b;text-align:right'>×{i.get('quantity',1)}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #1e293b;text-align:right'>₹{i.get('unit_price',0)//100 * i.get('quantity',1)}</td></tr>"
        for i in (order.get("items") or [])
    )
    total = order.get("total_paise", 0) // 100
    html = f"""<!DOCTYPE html><html><body style="background:#0f172a;font-family:sans-serif;color:#e2e8f0;padding:32px">
<div style="max-width:560px;margin:0 auto">
  <h2 style="color:white;margin-bottom:4px">Order Confirmed! 🎉</h2>
  <p style="color:#94a3b8">Thanks {order.get('customer_name','')}, your Mailair goodies are on their way.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#1e293b;border-radius:8px">
    <thead><tr style="border-bottom:1px solid #334155">
      <th style="padding:10px;text-align:left;color:#94a3b8;font-size:12px">Item</th>
      <th style="padding:10px;text-align:right;color:#94a3b8;font-size:12px">Qty</th>
      <th style="padding:10px;text-align:right;color:#94a3b8;font-size:12px">Total</th>
    </tr></thead>
    <tbody>{items_html}</tbody>
    <tfoot><tr><td colspan="2" style="padding:10px;text-align:right;font-weight:bold">Total</td>
    <td style="padding:10px;text-align:right;font-weight:bold;color:#34d399">₹{total}</td></tr></tfoot>
  </table>
  <p style="color:#64748b;font-size:12px">We'll ship within 3-5 business days. Reply to this email with questions.</p>
</div></body></html>"""

    try:
        await send_resend_email(order["customer_email"], f"Order Confirmed — Mailair Shop #{order['id'][:8].upper()}", html)
    except Exception as exc:
        logger.error("Order confirmation email failed: %s", exc)


@router.get("/orders/{order_id}")
async def get_order(order_id: str, email: str):
    """Fetch order by ID + email (no auth — for confirmation page)."""
    supabase = get_supabase()
    result = (
        supabase.table("shop_orders")
        .select("*")
        .eq("id", order_id)
        .eq("customer_email", email)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return result.data


# ─── Admin ────────────────────────────────────────────────────────────────────

class ProductBody(BaseModel):
    name: str
    description: str
    price: int                           # INR (not paise, for display)
    price_paise: int                     # INR × 100
    images: list[str] = []
    category: str = "apparel"           # apparel | accessories | stationery | digital
    variants: list[dict] = []           # [{name: "S / Black"}, ...]
    allows_custom: bool = False
    custom_label: str = "Custom Text"   # e.g. "Your Name", "Company Name"
    available: bool = True
    tags: list[str] = []


@router.post("/admin/products", status_code=201)
async def admin_create_product(body: ProductBody, current_user: dict = Depends(get_current_user)):
    if current_user.get("email") not in (settings.ADMIN_EMAIL, "tarrasridhar1154@gmail.com"):
        raise HTTPException(status_code=403, detail="Admin only")
    supabase = get_supabase()
    result = supabase.table("shop_products").insert(body.model_dump()).execute()
    return result.data[0] if result.data else {}


@router.patch("/admin/products/{product_id}")
async def admin_update_product(product_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("email") not in (settings.ADMIN_EMAIL, "tarrasridhar1154@gmail.com"):
        raise HTTPException(status_code=403, detail="Admin only")
    supabase = get_supabase()
    result = supabase.table("shop_products").update(body).eq("id", product_id).execute()
    return result.data[0] if result.data else {}


@router.get("/admin/orders")
async def admin_list_orders(current_user: dict = Depends(get_current_user)):
    if current_user.get("email") not in (settings.ADMIN_EMAIL, "tarrasridhar1154@gmail.com"):
        raise HTTPException(status_code=403, detail="Admin only")
    supabase = get_supabase()
    result = supabase.table("shop_orders").select("*").order("created_at", desc=True).limit(100).execute()
    return {"orders": result.data or []}


@router.patch("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("email") not in (settings.ADMIN_EMAIL, "tarrasridhar1154@gmail.com"):
        raise HTTPException(status_code=403, detail="Admin only")
    supabase = get_supabase()
    result = supabase.table("shop_orders").update({"status": body.get("status")}).eq("id", order_id).execute()
    return result.data[0] if result.data else {}
