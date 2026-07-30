import { createFileRoute } from "@tanstack/react-router";
import { EntityProfile } from "@/components/EntityProfile";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer Account Statement — Business Ledger" },
      {
        name: "description",
        content: "Customer profile, running balance and full transaction ledger.",
      },
      { property: "og:title", content: "Customer Account Statement — Business Ledger" },
      {
        property: "og:description",
        content: "Customer profile, running balance and full transaction ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerProfileRoute,
});

function CustomerProfileRoute() {
  const { id } = Route.useParams();
  return <EntityProfile id={id} type="customer" />;
}
