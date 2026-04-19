import { auth } from "@/lib/auth";
import { fetchProposals } from "@/lib/fetch-all";
import ProposalsClient from "./ProposalsClient";

export default async function VendorProposalsPage() {
  const session = await auth();
  const supplierName = (session as any)?.displayName || "";
  const proposals = await fetchProposals(supplierName, 30);

  return <ProposalsClient proposals={proposals} supplierName={supplierName} />;
}
