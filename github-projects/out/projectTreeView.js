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
exports.ProjectTreeView = void 0;
const vscode = require("vscode");
class ProjectTreeView {
    constructor(octokit) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.data = [];
        this.octokit = octokit;
        this.refreshData();
    }
    refreshData() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data = [];
            yield this.octokit.request('GET /user/orgs').then(res => {
                var projects = [];
                for (var org of res['data']) {
                    this.data.push(new ProjectItem(org['id'], org['login'], undefined, undefined));
                }
            });
            console.log(this.data);
            for (var org of this.data) {
                yield org.popChildren(this.octokit);
            }
            this._onDidChangeTreeData.fire();
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element === undefined) {
            return this.data;
        }
        return element.children;
    }
}
exports.ProjectTreeView = ProjectTreeView;
class ProjectItem extends vscode.TreeItem {
    constructor(id, label, children, url, command) {
        super(label, url === undefined ? vscode.TreeItemCollapsibleState.Expanded :
            vscode.TreeItemCollapsibleState.None);
        this.command = command;
        this.children = children;
        this.url = url;
        this.githubId = id;
    }
    popChildren(octokit) {
        return __awaiter(this, void 0, void 0, function* () {
            yield octokit.request(`GET /orgs/${this.label}/projects`, {
                org: 'org',
                mediaType: {
                    previews: [
                        'inertia'
                    ]
                }
            }).then(res => {
                for (var proj of res['data']) {
                    console.log(proj['name']);
                    if (this.children) {
                        this.children.push(new ProjectItem(proj['id'], proj['name'], undefined, proj['html_url'], {
                            command: 'github-projects.githubProjectsStart',
                            title: '',
                            arguments: [proj['id'], proj['html_url'], proj['name']]
                        }));
                    }
                    else {
                        this.children = [];
                        this.children.push(new ProjectItem(proj['id'], proj['name'], undefined, proj['html_url'], {
                            command: 'github-projects.githubProjectsStart',
                            title: '',
                            arguments: [proj['id'], proj['html_url'], proj['name']]
                        }));
                    }
                }
            });
        });
    }
}
//# sourceMappingURL=projectTreeView.js.map