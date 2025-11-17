const cleanupTasks: (() => Promise<void>)[] = [];
let shuttingDown = false;

export function registerCleanupTask(task: () => Promise<void>) {
    cleanupTasks.push(task);
}

export async function runCleanupTasks() {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const task of cleanupTasks) {
        try {
            await task();
        } catch (err) {
            console.error("Cleanup task failed:", err);
        }
    }
}
