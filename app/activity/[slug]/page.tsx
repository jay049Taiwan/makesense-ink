import type { Metadata } from "next";
import ActivityClient from "./ActivityClient";

export const metadata: Metadata = { title: "活動" };

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ActivityClient slug={slug} />;
}
