import * as vscode from 'vscode';
import * as Octokit from '@octokit/rest';

const GITHUB_AUTH_PROVIDER_ID = 'github';
// The GitHub Authentication Provider accepts the scopes described here:
// https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
const SCOPES = ['admin:org', 'repo'];

export class Credentials {
	private octokit: Octokit.Octokit | undefined;

	async initialize(context: vscode.ExtensionContext): Promise<void> {
		this.registerListeners(context);
		this.setOctokit();
	}

	async getAccessToken() {
		const session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: false });
		if (session) {
			return session.accessToken;
		}
		return undefined;
	}

	private async setOctokit() {
		/**
		 * By passing the `createIfNone` flag, a numbered badge will show up on the accounts activity bar icon.
		 * An entry for the sample extension will be added under the menu to sign in. This allows quietly 
		 * prompting the user to sign in.
		 * */
		const session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: false });
        console.log(session);
		if (session) {
            console.log(session);
            
			this.octokit = new Octokit.Octokit({
				auth: session.accessToken
			});

			return;
		}
        // https://api.github.com/orgs/H2O-Connected-LLC/projects
        // https://github.com/orgs/nth-solutions/projects/2
        // https://github.com/JosephCottingham/MockTrialBallotSite

		this.octokit = undefined;
	}


	registerListeners(context: vscode.ExtensionContext): void {
		/**
		 * Sessions are changed when a user logs in or logs out.
		 */
		context.subscriptions.push(vscode.authentication.onDidChangeSessions(async e => {
			if (e.provider.id === GITHUB_AUTH_PROVIDER_ID) {
				await this.setOctokit();
			}
		}));
	}

	async getOctokit(): Promise<Octokit.Octokit> {
		if (this.octokit) {
			return this.octokit;
		}

		/**
		 * When the `createIfNone` flag is passed, a modal dialog will be shown asking the user to sign in.
		 * Note that this can throw if the user clicks cancel.
		 */
        var session = null;
        while (!session) {
            console.log('test');
            
		    session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: true });
        }
        this.octokit = new Octokit.Octokit({
            auth: session.accessToken
        });

		return this.octokit;
	}
}