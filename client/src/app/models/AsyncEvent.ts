import { TaskCompletionSource } from './TaskCompletionSource';

export class AsyncEvent extends TaskCompletionSource<void> {
  private fired = false;

  wait() {
    if (this.fired) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.task.then(() => resolve(true));
      this.task.catch((err) => reject(err));
    });
  }

  set() {
    this.fired = true;
    this.setResult();
  }
}
