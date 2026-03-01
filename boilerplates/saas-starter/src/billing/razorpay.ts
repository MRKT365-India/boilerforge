import { Router, Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../db/prisma";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const billingRouter = Router();

// Create a subscription order
billingRouter.post("/create-order", async (req: Request, res: Response) => {
  const { planId, orgId } = req.body;
  if (!planId || !orgId) {
    return res.status(400).json({ error: "planId and orgId are required" });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const order = await razorpay.orders.create({
    amount: plan.priceInPaise,
    currency: "INR",
    receipt: `order_${orgId}_${Date.now()}`,
    notes: { orgId, planId },
  });

  await prisma.order.create({
    data: {
      razorpayOrderId: order.id,
      orgId,
      planId,
      amount: plan.priceInPaise,
      status: "created",
    },
  });

  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// Verify payment after Razorpay checkout
billingRouter.post("/verify-payment", async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification fields" });
  }

  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  const order = await prisma.order.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      razorpayPaymentId: razorpay_payment_id,
      status: "paid",
    },
  });

  // Activate the subscription for the org
  await prisma.org.update({
    where: { id: order.orgId },
    data: { planId: order.planId, subscriptionActive: true },
  });

  res.json({ success: true, orderId: order.razorpayOrderId });
});

// Razorpay webhook handler
billingRouter.post("/webhook", async (req: Request, res: Response) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const signature = req.headers["x-razorpay-signature"] as string;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expectedSig !== signature) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  if (event === "payment.captured") {
    const paymentId = payload.payment.entity.id;
    const orderId = payload.payment.entity.order_id;
    await prisma.order.updateMany({
      where: { razorpayOrderId: orderId },
      data: { razorpayPaymentId: paymentId, status: "captured" },
    });
  }

  if (event === "payment.failed") {
    const orderId = payload.payment.entity.order_id;
    await prisma.order.updateMany({
      where: { razorpayOrderId: orderId },
      data: { status: "failed" },
    });
  }

  res.json({ received: true });
});
