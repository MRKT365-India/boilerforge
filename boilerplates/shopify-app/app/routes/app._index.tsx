import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Box,
  List,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    include: { appInstalls: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return json({
    shopDomain: session.shop,
    shopName: shop?.shopName || session.shop,
    installedAt: shop?.installedAt?.toISOString() || null,
    plan: shop?.plan || "none",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Example: fetch shop info from Shopify GraphQL Admin API
  const response = await admin.graphql(`
    {
      shop {
        name
        plan {
          displayName
        }
        myshopifyDomain
      }
    }
  `);

  const data = await response.json();
  const shopData = data.data?.shop;

  if (shopData) {
    await prisma.shop.update({
      where: { shopDomain: shopData.myshopifyDomain },
      data: {
        shopName: shopData.name,
        plan: shopData.plan?.displayName,
      },
    });
  }

  return json({ success: true });
};

export default function AppIndex() {
  const { shopDomain, shopName, installedAt, plan } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Welcome to your Shopify App
                  </Text>
                  <Badge tone="success">Connected</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  Your app is installed on <strong>{shopName}</strong> (
                  {shopDomain}).
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Shop Details
                  </Text>
                  <Box>
                    <List>
                      <List.Item>Domain: {shopDomain}</List.Item>
                      <List.Item>Plan: {plan}</List.Item>
                      {installedAt && (
                        <List.Item>
                          Installed:{" "}
                          {new Date(installedAt).toLocaleDateString()}
                        </List.Item>
                      )}
                    </List>
                  </Box>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Getting Started
                  </Text>
                  <List>
                    <List.Item>
                      Edit app/routes/app._index.tsx to customise this page
                    </List.Item>
                    <List.Item>
                      Add new routes under app/routes/app.*.tsx
                    </List.Item>
                    <List.Item>
                      Use the Shopify Admin GraphQL API for store data
                    </List.Item>
                    <List.Item>
                      Configure webhooks in app/shopify.server.ts
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
