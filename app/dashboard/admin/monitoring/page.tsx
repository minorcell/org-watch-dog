import type { Metadata } from "next";
import { MonitoringPanel } from "@/components/admin/monitoring-panel";

export const metadata: Metadata = { title: "监控仓库" };

export default function MonitoringPage() {
  return <MonitoringPanel />;
}
