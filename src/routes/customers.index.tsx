import { createFileRoute } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Business Ledger" },
      { name: "description", content: "Manage customers, balances and account statements." },
      { property: "og:title", content: "Customers — Business Ledger" },
      { property: "og:description", content: "Manage customers, balances and account statements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <EntityList type="customer" />,
});
