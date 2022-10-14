const actionscore = require('@actions/core')
const { setFailed, warning, notice, debug, setOutput } = actionscore
const actionsgithub = require('@actions/github')
const { GitHub, context } = actionsgithub

async function run () {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN)

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const id = process.env.RELEASE_ID || process.env.INPUT_RELEASE_ID || '' // getInput('release_id', { required: false })
    const tag = process.env.TAG || process.env.INPUT_TAG || '' // getInput('tag', { required: false })
    const deleteOrphan = (process.env.INPUT_DELETE_ORPHAN_TAG || '').trim().toLowerCase() === 'true'

    if (!id && !tag) {
      setFailed('At least one of the following inputs must be defined: release_id or tag.')
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
        warning(`Could not retrieve release for ${tag}: ${e.message}`)
      }

      if (!data) {
        if (deleteOrphan) {
          const deleteTagResponse = await github.git.deleteRef({
            owner,
            repo,
            ref: `tags/${tag}`
          })

          if (deleteTagResponse) {
            notice(`Removed ${tag}, even though there was no associated release.`)
            return
          }
        }

        setFailed(`Tag "${tag}" was not found or a release ID is not associated with it.`)
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
        debug(JSON.stringify(data, null, 2))
        setFailed(`Release "${id}" was not found.`)
        return
      }

      data = data.data
    }

    debug(JSON.stringify(data, null, 2))

    // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
    debug(`Removing release ${data.id}`)
    const response = await github.repos.deleteRelease({
      owner,
      repo,
      release_id: data.id
    })

    debug(JSON.stringify(response, null, 2))

    // Delete tag reference
    debug(`Removing reference: tags/${data.tag_name}`)
    const tagresponse = await github.git.deleteRef({
      owner,
      repo,
      ref: `tags/${data.tag_name}`
    })

    debug(JSON.stringify(tagresponse, null, 2))
    setOutput('release_id', data.id.toString())
    setOutput('tag', data.tag_name.toString())
  } catch (e) {
    warning(e.stack)
    setFailed(e.message)
  }
}

run()
