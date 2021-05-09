import * as vscode from 'vscode';
import * as Octokit from '@octokit/rest';

export class ProjectTreeView implements vscode.TreeDataProvider<ProjectItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

    data: ProjectItem[];
    octokit: Octokit.Octokit;

    constructor(octokit: Octokit.Octokit) {      
      this.data = [];
      this.octokit = octokit;
      this.refreshData();
    }
    
    async refreshData() {
      this.data = [];
      await this.octokit.request('GET /user/orgs').then(res => {
            var projects: ProjectItem[] = [];
            for (var org of res['data']) {  
              this.data.push(new ProjectItem(org['id'], org['login'], undefined, undefined));
            }
          }
      );
      console.log(this.data);
      for (var org of this.data) {
        await org.popChildren(this.octokit);
      }
      this._onDidChangeTreeData.fire();
    }



    getTreeItem(element: ProjectItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
      return element;
    }
  
    getChildren(element?: ProjectItem|undefined): vscode.ProviderResult<ProjectItem[]> {
      if (element === undefined) {
        return this.data;
      }
      return element.children;
    }
  }

  class ProjectItem extends vscode.TreeItem {

    url?: string;
    children: ProjectItem[]|undefined;
    githubId: number;

    constructor(id: number, label: string, children?: ProjectItem[], url?: string, public readonly command?: vscode.Command) {
      super(
          label,
          url === undefined ? vscode.TreeItemCollapsibleState.Expanded :
                                   vscode.TreeItemCollapsibleState.None);
      this.children = children;
      this.url = url;
      this.githubId = id;
    }

    async popChildren(octokit: Octokit.Octokit) {
      await octokit.request(`GET /orgs/${this.label}/projects`, {
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
            } else {
              this.children = [];
              this.children.push(new ProjectItem(proj['id'], proj['name'], undefined, proj['html_url'], {
                command: 'github-projects.githubProjectsStart',
                title: '',
                arguments: [proj['id'], proj['html_url'], proj['name']]
              }));
            }
          }
        });
    }
    
  }