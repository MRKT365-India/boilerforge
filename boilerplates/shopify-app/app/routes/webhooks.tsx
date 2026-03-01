import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      // Clean up shop data and mark as inactive
      await prisma.shop.update({
        where: { shopDomain: shop },
        data: {
          isActive: false,
          uninstalledAt: new Date(),
          accessToken: null,
        },
      });

      // Delete sessions for uninstalled shop
      await prisma.session.deleteMany({ where: { shop } });
      break;

    case "SHOP_UPDATE":
      // Sync shop details when the merchant updates their store
      const shopPayload = payload as { name?: string; plan_name?: string; email?: string };
      await prisma.shop.update({
        where: { shopDomain: shop },
        data: {
          shopName: shopPayload.name || undefined,
          plan: shopPayload.plan_name || undefined,
          email: shopPayload.email || undefined,
        },
      });
      break;

    case "CUSTOMERS_DATA_REQUEST":
      // Handle GDPR data request — return customer data you store
      // Implement: query your DB for any data related to the customer
      // and prepare it for export
      console.log(`Customer data request for shop ${shop}`);
      break;

    case "CUSTOMERS_REDACT":
      // Handle GDPR customer data deletion request
      // Implement: delete all customer-related data from your DB
      console.log(`Customer redact request for shop ${shop}`);
      break;

    case "SHOP_REDACT":
      // Handle GDPR shop data deletion (48h after uninstall)
      // Implement: delete all data related to this shop
      await prisma.appInstall.deleteMany({
        where: { shop: { shopDomain: shop } },
      });
      await prisma.shop.delete({ where: { shopDomain: shop } });
      console.log(`Shop redact completed for ${shop}`);
      break;

    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
};
