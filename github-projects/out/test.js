"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const octokit_1 = require("octokit");
var octokit = new octokit_1.Octokit({ auth: `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` });
let orgsResponse = octokit.request('GET /user/orgs');
console.log('orgsResponse');
console.log(orgsResponse);
//# sourceMappingURL=test.js.map