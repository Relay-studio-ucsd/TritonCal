# AGENTS.md

Instructions for AI coding agents working in this repository.

1. **Read [MAINDOC.md](MAINDOC.md) first.** §1 holds the project's hard rules (passive capture only, privacy, zero dependencies), which are non-negotiable, and the working conventions. §5 explains the extension architecture.
2. **One documentation file.** All technical documentation lives in MAINDOC.md. Do not create other technical Markdown files. The only other Markdown files are the READMEs, `extension/PRIVACY.md`, this file and `CLAUDE.md`. Put open questions in [GitHub Issues](https://github.com/Relay-studio-ucsd/TritonCal/issues), not in the docs.
3. **Attribute accurately.** Credit each decision or piece of work to the person who made it, using the git name recorded in the commit history (`git log`, PR authors), not whoever is currently giving instructions. Never invent or generalize authorship. Text written by an AI assistant is credited to that model by name, matching the `Co-Authored-By` trailer of the commit that adds it.
4. **Language.** Write MAINDOC.md and this file in English. READMEs are English first (`README.md`), with the Chinese version in `README.zh-CN.md`.
5. **Move code, don't retype it.** Use `git mv` for moves and targeted edits for changes, and check the result against the previous version with `git diff`. Run `npm test` before reporting work as done.
