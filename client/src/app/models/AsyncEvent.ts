import { TaskCompletionSource } from './TaskCompletionSource';

export class AsyncEvent extends TaskCompletionSource<void> {
  private fired = false;

  wait() {
    if (this.fired) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.task.then(() => resolve());
      this.task.catch((err) => reject(err));
    });
  }

  set() {
    this.fired = true;
    this.setResult();
  }
}
