const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN)

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const id = core.getInput('release_id', { required: false })
    const tag = core.getInput('tag', { required: false })

    if (!id && !tag) {
      core.setFailed('At least one of the following inputs must be defined: release_id or tag.')
      return
    }

    // Retrieve the release ID
    let data
    if (!id) {
      data = await github.repos.getReleaseByTag({
        owner,
        repo,
        tag
      }).data
      
      if (!data || !data.hasOwnProperty('id')) {
        core.setFailed(`"${tag}" was not found or a release ID is not associated with it.`)
        return
      } else {
        id = data.id
      }
    } else {
      data = await github.repos.getRelease({
        owner,
        repo,
        release_id: id
      }).data

      if (!data) {
        core.setFailed(`"${tag}" was not found or a release ID is not associated with it.`)
        return
      }
    }

    console.log(JSON.stringify(data, null, 2))
    
    // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
    console.log(`Removing release ${id}`)
    const response = await github.repos.deleteRelease({
      owner,
      repo,
      release_id: id
    })

    // Delete tag reference
    console.log(`Removing reference: refs/tags/${data.tag_name}`)
    const tagresponse = await github.git.deleteRef({
      owner,
      repo,
      ref: `refs/tags/${data.tag_name}`
    })

    core.setOutput('release_id', id)
    core.setOutput('tag', data.tag_name)
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()