# Security

Do not file a public issue for a vulnerability in the CLI or in `scripts/install.sh`.

Report privately: https://github.com/nyxsky404/vmup/security/advisories/new

Include the affected version (`vmup --version`), the command, and enough detail to reproduce.

vmup copies files you select onto a host you already SSH into. It does not open inbound ports. Treat remote batches as sensitive until TTL deletes them.
