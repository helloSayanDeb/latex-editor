/** Orders writes and keeps a debounced edit available for an explicit flush. */
export class SaveQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending: (() => Promise<void>) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.tail.catch(() => {}).then(task);
    this.tail = next;
    void next.catch(() => {});
    return next;
  }

  schedule(task: () => Promise<void>, delay = 400) {
    this.pending = task;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, delay);
  }

  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const task = this.pending;
    this.pending = null;
    return task ? this.enqueue(task) : this.tail;
  }
}
