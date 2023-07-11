import vscode from 'vscode';

export abstract class Panel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(protected readonly context: vscode.ExtensionContext) {}

  protected abstract createPanel(): vscode.WebviewPanel;

  protected columnSelector(): vscode.ViewColumn {
    return vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
  }

  public abstract get id(): string;

  protected onDidDispose() {}

  dispose() {
    this.panel = undefined;
    this.onDidDispose();
  }

  revealOrNew() {
    if (this.panel !== undefined) {
      this.panel.reveal(this.columnSelector());
    } else {
      this.panel = this.createPanel();
      this.panel.onDidDispose(
        () => this.dispose(),
        null,
        this.context.subscriptions
      );
    }
  }
}
