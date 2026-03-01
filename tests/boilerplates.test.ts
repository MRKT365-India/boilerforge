import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const BOILERPLATES_DIR = path.resolve(__dirname, "../boilerplates");

function getBoilerplates(): string[] {
  return fs
    .readdirSync(BOILERPLATES_DIR)
    .filter((f) => fs.statSync(path.join(BOILERPLATES_DIR, f)).isDirectory())
    .sort();
}

describe("boilerplate structure", () => {
  const boilerplates = getBoilerplates();

  it("has at least 5 boilerplates", () => {
    expect(boilerplates.length).toBeGreaterThanOrEqual(5);
  });

  for (const name of boilerplates) {
    describe(name, () => {
      const dir = path.join(BOILERPLATES_DIR, name);

      it("has a README.md", () => {
        const readmePath = path.join(dir, "README.md");
        expect(fs.existsSync(readmePath)).toBe(true);
        const content = fs.readFileSync(readmePath, "utf-8");
        expect(content.length).toBeGreaterThan(10);
      });

      it("has non-empty content", () => {
        const entries = fs.readdirSync(dir);
        expect(entries.length).toBeGreaterThan(0);
      });

      it("does not contain node_modules", () => {
        const nodeModules = path.join(dir, "node_modules");
        expect(fs.existsSync(nodeModules)).toBe(false);
      });

      it("does not contain .env files (only .env.example)", () => {
        const dotenv = path.join(dir, ".env");
        expect(fs.existsSync(dotenv)).toBe(false);
      });
    });
  }
});

describe("saas-starter", () => {
  const dir = path.join(BOILERPLATES_DIR, "saas-starter");

  it("has package.json", () => {
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(true);
  });

  it("has tsconfig.json", () => {
    expect(fs.existsSync(path.join(dir, "tsconfig.json"))).toBe(true);
  });

  it("has .env.example", () => {
    expect(fs.existsSync(path.join(dir, ".env.example"))).toBe(true);
  });

  it("has prisma schema", () => {
    expect(fs.existsSync(path.join(dir, "prisma", "schema.prisma"))).toBe(
      true
    );
  });

  it("prisma schema includes required models", () => {
    const schema = fs.readFileSync(
      path.join(dir, "prisma", "schema.prisma"),
      "utf-8"
    );
    expect(schema).toContain("model User");
    expect(schema).toContain("model Organization");
    expect(schema).toContain("model Subscription");
    expect(schema).toContain("model Plan");
    expect(schema).toContain("model Order");
  });

  it(".env.example includes required variables", () => {
    const env = fs.readFileSync(path.join(dir, ".env.example"), "utf-8");
    expect(env).toContain("DATABASE_URL");
    expect(env).toContain("JWT_SECRET");
    expect(env).toContain("RAZORPAY_KEY_ID");
    expect(env).toContain("RAZORPAY_KEY_SECRET");
    expect(env).toContain("RESEND_API_KEY");
  });
});

describe("nextjs-saas", () => {
  const dir = path.join(BOILERPLATES_DIR, "nextjs-saas");

  it("has package.json with Next.js and required dependencies", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8")
    );
    expect(pkg.dependencies.next).toBeDefined();
    expect(pkg.dependencies["next-auth"]).toBeDefined();
    expect(pkg.dependencies["@next-auth/prisma-adapter"]).toBeDefined();
    expect(pkg.dependencies.razorpay).toBeDefined();
  });

  it("has app layout", () => {
    expect(fs.existsSync(path.join(dir, "src", "app", "layout.tsx"))).toBe(
      true
    );
  });

  it("has landing page", () => {
    expect(fs.existsSync(path.join(dir, "src", "app", "page.tsx"))).toBe(true);
  });

  it("has dashboard page", () => {
    expect(
      fs.existsSync(path.join(dir, "src", "app", "dashboard", "page.tsx"))
    ).toBe(true);
  });

  it("has NextAuth route", () => {
    expect(
      fs.existsSync(
        path.join(
          dir,
          "src",
          "app",
          "api",
          "auth",
          "[...nextauth]",
          "route.ts"
        )
      )
    ).toBe(true);
  });

  it("has prisma client lib", () => {
    expect(fs.existsSync(path.join(dir, "src", "lib", "prisma.ts"))).toBe(
      true
    );
  });

  it("has razorpay client lib", () => {
    expect(fs.existsSync(path.join(dir, "src", "lib", "razorpay.ts"))).toBe(
      true
    );
  });

  it("has prisma schema", () => {
    const schema = fs.readFileSync(
      path.join(dir, "prisma", "schema.prisma"),
      "utf-8"
    );
    expect(schema).toContain("model User");
    expect(schema).toContain("model Account");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Organization");
  });
});

describe("whatsapp-bot", () => {
  const dir = path.join(BOILERPLATES_DIR, "whatsapp-bot");

  it("has package.json with baileys", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8")
    );
    expect(pkg.dependencies.express).toBeDefined();
    expect(pkg.dependencies.axios).toBeDefined();
  });

  it("has webhook handler", () => {
    expect(fs.existsSync(path.join(dir, "src", "index.ts"))).toBe(true);
  });

  it("has message handler", () => {
    expect(
      fs.existsSync(path.join(dir, "src", "handlers", "message.ts"))
    ).toBe(true);
  });

  it("has command handler", () => {
    expect(
      fs.existsSync(path.join(dir, "src", "handlers", "commands.ts"))
    ).toBe(true);
  });

  it(".env.example includes required variables", () => {
    const env = fs.readFileSync(path.join(dir, ".env.example"), "utf-8");
    expect(env).toContain("WHATSAPP_TOKEN");
    expect(env).toContain("VERIFY_TOKEN");
    expect(env).toContain("PHONE_NUMBER_ID");
  });
});

describe("react-native", () => {
  const dir = path.join(BOILERPLATES_DIR, "react-native");

  it("has package.json", () => {
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(true);
  });

  it("has app entry layout", () => {
    expect(fs.existsSync(path.join(dir, "src", "app", "_layout.tsx"))).toBe(
      true
    );
  });
});

describe("ci-cd", () => {
  const dir = path.join(BOILERPLATES_DIR, "ci-cd");

  it("has all workflow files referenced in README", () => {
    expect(
      fs.existsSync(path.join(dir, ".github", "workflows", "ci.yml"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(dir, ".github", "workflows", "deploy.yml"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(dir, ".github", "workflows", "release.yml"))
    ).toBe(true);
  });
});

describe("shopify-app", () => {
  const dir = path.join(BOILERPLATES_DIR, "shopify-app");

  it("has package.json with Shopify and Remix dependencies", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8")
    );
    expect(pkg.dependencies["@shopify/shopify-app-remix"]).toBeDefined();
    expect(pkg.dependencies["@shopify/polaris"]).toBeDefined();
    expect(pkg.dependencies["@remix-run/node"]).toBeDefined();
    expect(pkg.dependencies["@prisma/client"]).toBeDefined();
  });

  it("has tsconfig.json", () => {
    expect(fs.existsSync(path.join(dir, "tsconfig.json"))).toBe(true);
  });

  it("has .env.example with required variables", () => {
    const env = fs.readFileSync(path.join(dir, ".env.example"), "utf-8");
    expect(env).toContain("SHOPIFY_API_KEY");
    expect(env).toContain("SHOPIFY_API_SECRET");
    expect(env).toContain("SCOPES");
    expect(env).toContain("HOST");
    expect(env).toContain("DATABASE_URL");
  });

  it("has prisma schema with required models", () => {
    const schema = fs.readFileSync(
      path.join(dir, "prisma", "schema.prisma"),
      "utf-8"
    );
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Shop");
    expect(schema).toContain("model AppInstall");
  });

  it("has Remix root with AppProvider", () => {
    const root = fs.readFileSync(path.join(dir, "app", "root.tsx"), "utf-8");
    expect(root).toContain("AppProvider");
  });

  it("has authenticated app layout", () => {
    const appRoute = fs.readFileSync(
      path.join(dir, "app", "routes", "app.tsx"),
      "utf-8"
    );
    expect(appRoute).toContain("authenticate.admin");
  });

  it("has dashboard home page", () => {
    expect(
      fs.existsSync(path.join(dir, "app", "routes", "app._index.tsx"))
    ).toBe(true);
  });

  it("has shopify server config", () => {
    const server = fs.readFileSync(
      path.join(dir, "app", "shopify.server.ts"),
      "utf-8"
    );
    expect(server).toContain("shopifyApp");
    expect(server).toContain("authenticate");
    expect(server).toContain("APP_UNINSTALLED");
  });

  it("has Prisma client singleton", () => {
    expect(fs.existsSync(path.join(dir, "app", "db.server.ts"))).toBe(true);
  });

  it("has webhook handler", () => {
    const webhooks = fs.readFileSync(
      path.join(dir, "app", "routes", "webhooks.tsx"),
      "utf-8"
    );
    expect(webhooks).toContain("APP_UNINSTALLED");
    expect(webhooks).toContain("CUSTOMERS_DATA_REQUEST");
    expect(webhooks).toContain("SHOP_REDACT");
  });
});

describe("ai-agent-memory", () => {
  const dir = path.join(BOILERPLATES_DIR, "ai-agent-memory");

  it("has package.json", () => {
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(true);
  });

  it("has memory module", () => {
    expect(
      fs.existsSync(path.join(dir, "src", "memory", "long-term.ts"))
    ).toBe(true);
  });
});
