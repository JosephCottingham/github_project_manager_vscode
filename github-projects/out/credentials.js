"use strict";
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
exports.Credentials = void 0;
const vscode = require("vscode");
const Octokit = require("@octokit/rest");
const GITHUB_AUTH_PROVIDER_ID = 'github';
// The GitHub Authentication Provider accepts the scopes described here:
// https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
const SCOPES = ['admin:org', 'repo'];
class Credentials {
    initialize(context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.registerListeners(context);
            this.setOctokit();
        });
    }
    getAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: false });
            if (session) {
                return session.accessToken;
            }
            return undefined;
        });
    }
    setOctokit() {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * By passing the `createIfNone` flag, a numbered badge will show up on the accounts activity bar icon.
             * An entry for the sample extension will be added under the menu to sign in. This allows quietly
             * prompting the user to sign in.
             * */
            const session = yield vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: false });
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
        });
    }
    registerListeners(context) {
        /**
         * Sessions are changed when a user logs in or logs out.
         */
        context.subscriptions.push(vscode.authentication.onDidChangeSessions((e) => __awaiter(this, void 0, void 0, function* () {
            if (e.provider.id === GITHUB_AUTH_PROVIDER_ID) {
                yield this.setOctokit();
            }
        })));
    }
    getOctokit() {
        return __awaiter(this, void 0, void 0, function* () {
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
                session = yield vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: true });
            }
            this.octokit = new Octokit.Octokit({
                auth: session.accessToken
            });
            return this.octokit;
        });
    }
}
exports.Credentials = Credentials;
//# sourceMappingURL=credentials.js.map