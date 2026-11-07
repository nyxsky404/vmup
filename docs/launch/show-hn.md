# Show HN submission

Title: Show HN: vmup – Send local files to remote coding agents over SSH

URL: https://github.com/nyxsky404/vmup

## Introductory comment

When a coding agent runs on a remote VM, a screenshot on your laptop is still just a local file. vmup collects screenshots, PDFs, recordings, or other files, uploads them over your existing SSH connection into one batch folder, and copies a prompt containing that folder path. Paste it into the agent thread.

Install: `npm i -g @nyxsky404/vmup`

Then run `vmup init` and `vmup shot.png notes.pdf`. You need Node 18+, OpenSSH, and a host you can already SSH into. macOS, Linux, and WSL are supported.

It also supports a file picker, clipboard collection, watched folders, named host profiles, and JSON output. Batches expire after five minutes by default, with remote cleanup and a client fallback. Transfers use OpenSSH; no agent plugin or upload service is required.

Try the guided browser simulation: https://vmup.dev/#demo

The browser demo uses sample files and does not connect to a server. The CLI is MIT licensed. Feedback on the first-upload flow and cleanup behavior would be useful.

## Posting

Read https://news.ycombinator.com/showhn.html, check for a previous submission, and submit the title and repository URL at https://news.ycombinator.com/submit. Add the introductory comment once the submission exists. Stay available to discuss it; do not request votes. Verify the live demo is deployed before posting.
