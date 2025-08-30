# AGENTS Instructions for OpenAI Codex

The scope of these instructions is the entire repository.

## Development
- Use `pnpm` for all package management and script commands.
- Follow the existing code style; run `pnpm lint` after making changes.
- Prefer TypeScript when adding new files.
- Do not commit build artifacts or secrets.

## Testing
- Before opening a pull request, run:
  - `pnpm lint`
  - `pnpm build`
