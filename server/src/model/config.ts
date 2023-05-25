export class Config {
	constructor(
		public workspaceRoot: string,
		public contentPath: string = "interactives"
	) { }

	public get contentDirectory() {
		return `${this.workspaceRoot}/${this.contentPath}`
	}
}