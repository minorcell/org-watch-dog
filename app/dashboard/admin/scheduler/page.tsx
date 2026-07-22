import type { Metadata } from "next";
import { SchedulerPanel } from "@/components/admin/scheduler-panel";

export const metadata: Metadata = { title: "调度任务" };

export default function SchedulerPage() {
  return <SchedulerPanel />;
}
