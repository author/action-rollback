// index.js
import * as core from "@actions/core";
import { GitHub, context } from "@actions/github";
async function run() {
  try {
    const github = new GitHub(process.env.GITHUB_TOKEN);
    const { owner, repo } = context.repo;
    const id = process.env.RELEASE_ID || process.env.INPUT_RELEASE_ID || "";
    const tag = process.env.TAG || process.env.INPUT_TAG || "";
    const deleteOrphan = (process.env.INPUT_DELETE_ORPHAN_TAG || "").trim().toLowerCase() === "true";
    if (!id && !tag) {
      core.setFailed("At least one of the following inputs must be defined: release_id or tag.");
      return;
    }
    let data;
    if (!id) {
      try {
        data = await github.repos.getReleaseByTag({
          owner,
          repo,
          tag
        });
      } catch (e) {
        core.warning(`Could not retrieve release for ${tag}: ${e.message}`);
      }
      if (!data) {
        if (deleteOrphan) {
          const deleteTagResponse = await github.git.deleteRef({
            owner,
            repo,
            ref: `tags/${tag}`
          });
          if (deleteTagResponse) {
            core.notice(`Removed ${tag}, even though there was no associated release.`);
            return;
          }
        }
        core.setFailed(`Tag "${tag}" was not found or a release ID is not associated with it.`);
        return;
      }
      data = data.data;
    } else {
      data = await github.repos.getRelease({
        owner,
        repo,
        release_id: id
      });
      if (!data) {
        core.debug(JSON.stringify(data, null, 2));
        core.setFailed(`Release "${id}" was not found.`);
        return;
      }
      data = data.data;
    }
    core.debug(JSON.stringify(data, null, 2));
    core.debug(`Removing release ${data.id}`);
    const response = await github.repos.deleteRelease({
      owner,
      repo,
      release_id: data.id
    });
    core.debug(JSON.stringify(response, null, 2));
    core.debug(`Removing reference: tags/${data.tag_name}`);
    const tagresponse = await github.git.deleteRef({
      owner,
      repo,
      ref: `tags/${data.tag_name}`
    });
    core.debug(JSON.stringify(tagresponse, null, 2));
    core.setOutput("release_id", data.id.toString());
    core.setOutput("tag", data.tag_name.toString());
  } catch (e) {
    core.warning(e.stack);
    core.setFailed(e.message);
  }
}
run();
