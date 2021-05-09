'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const projectTreeView_1 = require("./projectTreeView");
const credentials_1 = require("./credentials");
const path = require("path");
const fs = require("fs");
const Handlebars = require("handlebars");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const credentials = new credentials_1.Credentials();
        yield credentials.initialize(context);
        var octokit = yield credentials.getOctokit();
        var userInfo = yield octokit.users.getAuthenticated();
        vscode.window.showInformationMessage(`Logged into GitHub as ${userInfo.data.login}`);
        context.subscriptions.push(vscode.commands.registerCommand('github-projects.getGitHubUser', () => __awaiter(this, void 0, void 0, function* () {
            octokit = yield credentials.getOctokit();
            userInfo = yield octokit.users.getAuthenticated();
            vscode.window.showInformationMessage(`Logged into GitHub as ${userInfo.data.login}`);
        })));
        octokit = yield credentials.getOctokit();
        const githubAccessCode = yield credentials.getAccessToken();
        const projectTreeView = new projectTreeView_1.ProjectTreeView(octokit);
        vscode.window.registerTreeDataProvider('projectTreeView', projectTreeView);
        context.subscriptions.push(vscode.commands.registerCommand('github-projects.githubProjectsStart', (githubId, url, name) => {
            vscode.window.showInformationMessage('Opening Project View');
            Panel.createOrShow(context.extensionUri, url, name, octokit, githubAccessCode, githubId);
        }));
        if (vscode.window.registerWebviewPanelSerializer) {
            // Make sure we register a serializer in activation event
            vscode.window.registerWebviewPanelSerializer(Panel.viewType, {
                deserializeWebviewPanel(webviewPanel, state) {
                    return __awaiter(this, void 0, void 0, function* () {
                        console.log(`Got state: ${state}`);
                        // Reset the webview options so we use latest uri for `localResourceRoots`.
                        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                        Panel.revive(webviewPanel, context.extensionUri, octokit, githubAccessCode, 0);
                    });
                }
            });
        }
    });
}
exports.activate = activate;
function getWebviewOptions(extensionUri) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };
}
class Panel {
    constructor(panel, extensionUri, url, name, octokit, githubAccessCode, githubId) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._url = url;
        this._name = name;
        this._octokit = octokit;
        this._githubAccessCode = githubAccessCode;
        this._githubId = githubId;
        console.log('name');
        console.log(name);
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri, url, name, octokit, githubAccessCode, githubId) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        console.log(Panel.currentPanelList);
        // // If we already have a panel, show it.
        for (var panel of Panel.currentPanelList) {
            if (panel.getGithubId() === githubId) {
                panel._panel.reveal(column);
                return;
            }
        }
        // Otherwise, create a new panel.
        const newPanel = vscode.window.createWebviewPanel(Panel.viewType, 'Github Projects', column || vscode.ViewColumn.One, getWebviewOptions(extensionUri));
        Panel.currentPanelList.push(new Panel(newPanel, extensionUri, url, name, octokit, githubAccessCode, githubId));
    }
    static revive(panel, extensionUri, octokit, githubAccessCode, githubId) {
        console.log('revive');
        Panel.currentPanelList.push(new Panel(panel, extensionUri, '', 'NOT SET', octokit, githubAccessCode, githubId));
    }
    getGithubId() {
        return this._githubId;
    }
    doRefactor() {
        // Send a message to the webview webview.
        // You can send any JSON serializable data.
        this._panel.webview.postMessage({ command: 'refactor' });
    }
    dispose() {
        for (var i = 0; i < Panel.currentPanelList.length; i++) {
            if (Panel.currentPanelList[i].getGithubId() === this._githubId) {
                Panel.currentPanelList.splice(i, 1);
            }
        }
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('_update');
            const webview = this._panel.webview;
            this._panel.title = this._name;
            this._panel.webview.html = yield this._getHtmlForWebview(webview);
        });
    }
    _getHtmlForWebview(webview) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('_getHtmlForWebview');
            // // Local path to main script run in the webview
            // const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
            // // And the uri we use to load this script in the webview
            // const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
            // // Local path to css styles
            // const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
            // const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
            // // Uri to load styles into webview
            // const stylesResetUri = webview.asWebviewUri(styleResetPath);
            // const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
            // // Use a nonce to only allow specific scripts to be run
            // const nonce = getNonce();
            const filePath = vscode.Uri.file(path.join(this._extensionUri.fsPath, 'src', 'html', 'index.html'));
            // console.log(this._url);
            // const x = await this._octokit.request(`GET ${this._url}`).then(res => {
            // 	console.log('this._url');
            // 	console.log(this._url);
            // 	console.log(res);
            // });
            const template = Handlebars.compile(fs.readFileSync(filePath.fsPath, 'utf8'));
            console.log(this._name);
            return template({
                projectName: this._name,
                githubAccessCode: this._githubAccessCode,
                githubId: this._githubId
            });
        });
    }
}
/**
 * Track the currently panel. Only allow a single panel to exist at a time.
 */
Panel.currentPanelList = [];
Panel.viewType = 'View';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map