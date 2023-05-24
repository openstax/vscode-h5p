export class TaskCompletionSource<T, E = Error> {
	public task: Promise<T>;
	public setResult!: (value: T | PromiseLike<T>) => void;
	public cancel!: (reason?: E) => void;

	constructor() {
		this.task = new Promise((resolve, reject) => {
			this.setResult = resolve;
			this.cancel = reject;
		})
	}
}
