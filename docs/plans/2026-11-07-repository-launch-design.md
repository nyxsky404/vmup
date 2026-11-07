# Repository launch

Make the first visit explain the workflow in seconds: local files → SSH → one remote folder → a prompt to paste into a coding agent.

Use the existing monochrome terminal styling. Put an animated, explicitly illustrative terminal demo immediately below the README title and one-line description. Follow it with one npm installation command, prerequisites, and links to the interactive demo, docs, and contributor tasks. Keep advanced installation choices below the quick start.

Add a small guided simulation to the homepage at `#demo`, reusing the current layout rather than creating another landing page. Three ordinary buttons show collection, upload output, and the resulting prompt. It uses sample filenames, never accepts real uploads or SSH credentials, runs without timers, and supports keyboard navigation. Copying has explicit success and failure feedback. Server rendering exposes the initial sample and explanation without JavaScript.

Keep the existing MIT license, issue forms, CI, and package version. Expand the contributing guide with a first-contribution path and the repository's documentation/check requirements. Enable Discussions and relevant topics. Publish GitHub release notes for the already published and tagged v0.4.1 rather than inventing a package release.

Scan all fetched Git refs with Gitleaks and check GitHub secret alerts before deciding whether history needs remediation. Do not rewrite history when no secret is found. Prepare Show HN copy and an issue-response automation prompt; account access and the automation's explicit schedule confirmation remain separate final steps.

Validate with CLI build/tests, a production site build, browser checks at desktop and mobile widths, asset inspection, packaging inspection, and remote CI on the launch PR.
