// /api/create-payment.ts
import fetch from "node-fetch";

function setCors(res: any, origin: string) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: any, res: any) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

  if (req.method === "OPTIONS") {
    setCors(res, ALLOWED_ORIGIN);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    setCors(res, ALLOWED_ORIGIN);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const SHOP_ID = process.env.BEPAID_SHOP_ID;
    const SECRET_KEY = process.env.BEPAID_SECRET_KEY;
    if (!SHOP_ID || !SECRET_KEY) {
      setCors(res, ALLOWED_ORIGIN);
      return res.status(500).json({ error: "Missing BEPAID_SHOP_ID or BEPAID_SECRET_KEY" });
    }

    const { amount, description, order_id } = req.body || {};
    if (typeof amount !== "number" || amount <= 0) {
      setCors(res, ALLOWED_ORIGIN);
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payload = {
      checkout: {
        version: 2.1,
        test: true, // выключите на проде
        transaction_type: "payment",
        order: {
          amount: Math.round(amount * 100), // BYN в копейках
          currency: "BYN",
          description: description || "Заказ",
          order_id: String(order_id || Date.now())
        },
        settings: {
          success_url: `${FRONTEND_ORIGIN}/success`,
          fail_url: `${FRONTEND_ORIGIN}/fail`,
          cancel_url: `${FRONTEND_ORIGIN}/cancel`
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
    setCors(res, ALLOWED_ORIGIN);
    return res.status(r.ok ? 200 : 400).json(data); // data.checkout.redirect_url
  } catch (e: any) {
    setCors(res, ALLOWED_ORIGIN);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
