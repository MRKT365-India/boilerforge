const stats = [
  { label: "Total Users", value: "0", description: "Registered accounts" },
  { label: "Revenue", value: "₹0", description: "Monthly recurring" },
  { label: "Subscriptions", value: "0", description: "Active plans" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here is an overview of your SaaS.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
