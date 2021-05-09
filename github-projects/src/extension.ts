'use strict';
import * as vscode from 'vscode';
import axios, {AxiosResponse} from 'axios';
import * as Octokit from '@octokit/rest';

import { ProjectTreeView } from './projectTreeView';
import { Credentials } from './credentials';
import * as path from 'path';
import * as fs from 'fs';

const Handlebars = require("handlebars");


export async function activate(context: vscode.ExtensionContext) {
	const credentials = new Credentials();
	await credentials.initialize(context);
	var octokit = await credentials.getOctokit();
	var userInfo = await octokit.users.getAuthenticated();
	vscode.window.showInformationMessage(`Logged into GitHub as ${userInfo.data.login}`);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('github-projects.getGitHubUser', async () => {
			octokit = await credentials.getOctokit();
			userInfo = await octokit.users.getAuthenticated();
	
			vscode.window.showInformationMessage(`Logged into GitHub as ${userInfo.data.login}`);
		})
	);


	octokit = await credentials.getOctokit();
	const githubAccessCode = await credentials.getAccessToken();	
	const projectTreeView = new ProjectTreeView(octokit);
	vscode.window.registerTreeDataProvider('projectTreeView', projectTreeView);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('github-projects.githubProjectsStart', (githubId:number, url: string, name: string) => {
			
			vscode.window.showInformationMessage('Opening Project View');
			Panel.createOrShow(context.extensionUri, url, name, octokit, githubAccessCode, githubId);
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(Panel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				Panel.revive(webviewPanel, context.extensionUri, octokit, githubAccessCode, 0);
			}
		});
	}
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

class Panel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanelList: Panel[] = [];

	public static readonly viewType = 'View';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _url: string;
	private _name: string;
	private _octokit: Octokit.Octokit;
	private _githubAccessCode: string|undefined;
	private _githubId: number;

	public static createOrShow(extensionUri: vscode.Uri, url: string, name: string, octokit: Octokit.Octokit, githubAccessCode: string|undefined, githubId:number) {
		
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
		const newPanel = vscode.window.createWebviewPanel(
			Panel.viewType,
			'Github Projects',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		Panel.currentPanelList.push(new Panel(newPanel, extensionUri, url, name, octokit, githubAccessCode, githubId));
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, octokit: Octokit.Octokit, githubAccessCode: string|undefined, githubId:number) {
		console.log('revive');
		Panel.currentPanelList.push(new Panel(panel, extensionUri, '', 'NOT SET', octokit, githubAccessCode, githubId));
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, url: string, name: string, octokit: Octokit.Octokit, githubAccessCode: string|undefined, githubId: number) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._url = url;
		this._name = name;
		this._octokit = octokit;
		this._githubAccessCode = githubAccessCode;
		this._githubId = githubId

		console.log('name');
		console.log(name);


		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public getGithubId() {
		return this._githubId;
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
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

	private async _update() {
		console.log('_update');
		
		const webview = this._panel.webview;

		this._panel.title = this._name;
		this._panel.webview.html = await this._getHtmlForWebview(webview);
	}


	private async _getHtmlForWebview(webview: vscode.Webview) {
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
		const filePath: vscode.Uri = vscode.Uri.file(path.join(this._extensionUri.fsPath, 'src', 'html', 'index.html'));
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
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
