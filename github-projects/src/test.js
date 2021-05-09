const { Octokit } = require("octokit");

var octokit = new Octokit({ auth: `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` });
let orgsResponse = octokit.request('GET /user/orgs').then(res => {
        console.log('orgsResponse2');
        console.log(res);
    }
);
console.log('orgsResponse');
console.log(orgsResponse);