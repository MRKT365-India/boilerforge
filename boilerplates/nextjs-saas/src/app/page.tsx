import Link from "next/link";

const features = [
  {
    title: "Authentication",
    description:
      "Google OAuth and credentials login powered by NextAuth.js with session management and role-based access.",
  },
  {
    title: "Payments",
    description:
      "Razorpay integration for subscriptions and one-time payments, optimised for Indian businesses with INR support.",
  },
  {
    title: "Email",
    description:
      "Transactional email via Resend with React-based templates for welcome emails, invoices, and notifications.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Ship your SaaS faster
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A production-ready Next.js 14 starter with authentication, Razorpay
          payments, email, database, and a polished UI — everything you need to
          launch your India-focused SaaS.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to Dashboard
        </Link>
      </section>

      {/* Features */}
      <section className="border-t bg-secondary/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything you need
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
        Built with Next.js
      </footer>
    </div>
  );
}
