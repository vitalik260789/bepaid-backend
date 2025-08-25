// /api/create-payment.ts (Vercel serverless function)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const SHOP_ID = process.env.BEPAID_SHOP_ID;
    const SECRET_KEY = process.env.BEPAID_SECRET_KEY;
    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(500).json({ error: "Missing BEPAID_SHOP_ID or BEPAID_SECRET_KEY" });
    }

    const { amount, description, order_id } = req.body || {};

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payload = {
      checkout: {
        version: 2.1,
        test: true, // тестовый режим; отключите на проде
        transaction_type: "payment",
        order: {
          amount: Math.round(amount * 100), // BYN в копейках
          currency: "BYN",
          description: description || "Заказ",
          order_id: String(order_id || Date.now())
        },
        settings: {
          success_url: "https://YOUR_FRONTEND_DOMAIN/success",
          fail_url: "https://YOUR_FRONTEND_DOMAIN/fail",
          cancel_url: "https://YOUR_FRONTEND_DOMAIN/cancel"
        }
      }
    };

    const r = await fetch("https://gateway.bepaid.by/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64")
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    return res.status(r.ok ? 200 : 400).json(data); // ожидаем data.checkout.redirect_url
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
