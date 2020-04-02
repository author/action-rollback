const core = require('@actions/core')
const { GitHub, context } = require('@actions/github')

async function run () {
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
      try {
        data = await github.repos.getReleaseByTag({
          owner,
          repo,
          tag
        })
      } catch (e) {
        core.warning(`Could not retrieve release for ${tag}: ${e.message}`)
      }

      if (!data) {
        core.debug(JSON.stringify(data, null, 2))

        if (core.getInput('delete_orphan_tag', { required: false }) !== '') {
          const deleteTagResponse = await github.git.deleteRef({
            owner,
            repo,
            ref: `tags/${data.tag_name}`
          })

          if (deleteTagResponse) {
            core.warning(`Removed ${data.tag_name}, even though there was no associated release.`)
            return
          }
        }

        core.setFailed(`Tag "${tag}" was not found or a release ID is not associated with it.`)
        return
      }

      data = data.data
    } else {
      data = await github.repos.getRelease({
        owner,
        repo,
        release_id: id
      })

      if (!data) {
        core.debug(JSON.stringify(data, null, 2))
        core.setFailed(`Release "${id}" was not found.`)
        return
      }

      data = data.data
    }

    core.debug(JSON.stringify(data, null, 2))

    // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
    core.debug(`Removing release ${data.id}`)
    const response = await github.repos.deleteRelease({
      owner,
      repo,
      release_id: data.id
    })

    core.debug(JSON.stringify(response, null, 2))

    // Delete tag reference
    core.debug(`Removing reference: tags/${data.tag_name}`)
    const tagresponse = await github.git.deleteRef({
      owner,
      repo,
      ref: `tags/${data.tag_name}`
    })

    core.debug(JSON.stringify(tagresponse, null, 2))
    core.setOutput('release_id', data.id.toString())
    core.setOutput('tag', data.tag_name.toString())
  } catch (e) {
    core.warning(e.stack)
    core.setFailed(e.message)
  }
}

run()
