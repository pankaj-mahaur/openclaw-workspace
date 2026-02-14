---
name: qmd
description: Local hybrid search for markdown notes and docs. Use when searching notes, finding related content, or retrieving documents from indexed markdown collections.
---

# qmd - Quick Markdown Search

Use `qmd` to search local markdown collections quickly.

## Prefer search modes in this order

1. Use `qmd search` first (BM25, usually instant).
2. Use `qmd vsearch` only when keyword search misses and semantic matching is necessary.
3. Use `qmd query` only when the user explicitly asks for hybrid reranking and accepts slower runtime.

## Prerequisites

- Install Bun (`bun --version`)
- Install qmd:

```bash
bun install -g https://github.com/tobi/qmd
```

- Ensure PATH includes Bun bin:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

## Initial setup

```bash
qmd collection add /path/to/notes --name notes --mask "**/*.md"
qmd context add qmd://notes "Description of this collection"   # optional
qmd embed                                                         # enable semantic/hybrid search
```

## Low-token defaults (important)

- Start with `qmd search "query" -n 5 --files` to shortlist docs with minimal output.
- If snippets are needed, use `--json` with small `-n` (5 or less).
- Avoid `--full` unless the user explicitly asks for full document content.
- After shortlist, fetch only selected docs with `qmd get`.
- Use `vsearch/query` only when keyword search misses.

## Common commands

```bash
qmd search "query" -n 5 --files
qmd search "query" -c notes -n 5 --files
qmd search "query" -n 5 --json
qmd search "query" --all --files --min-score 0.3

qmd vsearch "query" -n 5 --files
qmd query "query" -n 5 --json

qmd get "path/to/file.md"
qmd get "#docid"
qmd multi-get "journals/2025-05*.md"
qmd multi-get "doc1.md, doc2.md, #abc123" --json

qmd status
qmd update
qmd embed
```

## Freshness automation

Use periodic updates to keep index current.

```bash
# hourly incremental update
0 * * * * export PATH="$HOME/.bun/bin:$PATH" && qmd update

# nightly embedding refresh (optional, slower)
0 5 * * * export PATH="$HOME/.bun/bin:$PATH" && qmd embed
```

## Notes

- `qmd` searches local indexed files, not agent memory.
- Use memory search tools for prior conversation decisions and saved memory facts.
