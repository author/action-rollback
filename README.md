# author/action-rollback

This action will rollback/delete a Github release. It is designed as a failsafe for workflows that do not complete, produce errors, fail to publish, or any other circumstance where removing a release is applicable.

For example, consider the lifecycle of a Javascript package being published to npm.

`test-->build-->tag-->release-->publish`

In the scenario where publishing fails, it may be desirable to rollback the release.

## Workflow

The following is an example `.github/publish.yml` that will rollback a release when a publish fails.

Configuring the action is straightforward:

```yaml
- name: Rollback Release
  if: failure()
  uses: author/action-rollback@stable
  with:
    # Using a known release ID
    id: ${{ steps.create_release.id }}
    # Using a tag name
    tag: 'v1.0.1'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

It's a bit easier to understand in context of a complete workflow:

```yaml
name: Publish

on:
  push:
    branches:
      - master

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Tag
        id: autotagger
        uses: butlerlogic/action-autotag@stable
        with:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
      
      - name: Release
        id: create_release
        if: steps.autotagger.outputs.tagname != ''
        uses: actions/create-release@v1.0.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.autotagger.outputs.tagname }}
          release_name: Version ${{ steps.autotagger.outputs.version }}
          body: ${{ steps.autotagger.outputs.tagmessage }}
          draft: false
          prerelease: true

      - name: Publish
        id: publish_npm
        if: steps.autotagger.outputs.tagname != ''
        uses: author/action-publish@stable
        env:
          REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}

      - name: Rollback Release
        if: failure() && steps.create_release.outputs.id != ''
        uses: author/action-rollback@stable
        with:
          # Using a known release ID
          id: ${{ steps.create_release.id }}
          # Using a tag name
          tag: ${{ steps.autotagger.outputs.tagname }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Only the `id` _**or**_ `tag` need to be specified. If a publish fails, the release will be removed.

---
## Credits

This action was written and is primarily maintained by [Corey Butler](https://github.com/coreybutler).

# Our Ask...

If you use this or find value in it, please consider contributing in one or more of the following ways:

1. Click the "Sponsor" button at the top of the page.
1. Star it!
1. [Tweet about it!](https://twitter.com/intent/tweet?hashtags=github,actions&original_referer=http%3A%2F%2F127.0.0.1%3A91%2F&text=I%20am%20automating%20my%20workflow%20with%20the%20Multipublisher%20Github%20action!&tw_p=tweetbutton&url=https%3A%2F%2Fgithub.com%2Fauthor%2Faction%2Fpublish&via=goldglovecb)
1. Fix an issue.
1. Add a feature (post a proposal in an issue first!).

Copyright &copy; 2020 Author.io, Corey Butler, and Contributors.
