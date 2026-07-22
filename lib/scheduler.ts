/**
 * Simple sequential task scheduler.
 * Each task runs in order; one failure never blocks the next.
 */

export type TaskResult = {
  task: string;
  ok: boolean;
  message: string;
  detail?: unknown;
};

export type ScheduledTask = {
  name: string;
  run: () => Promise<{ ok: boolean; message: string; detail?: unknown }>;
};

export async function runScheduler(tasks: ScheduledTask[]): Promise<TaskResult[]> {
  const results: TaskResult[] = [];

  for (const task of tasks) {
    try {
      const result = await task.run();
      results.push({ task: task.name, ok: result.ok, message: result.message, detail: result.detail });
    } catch (error) {
      results.push({
        task: task.name,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
