---
name: exa-mcp
description: Use Exa MCP tools for web research, advanced search, crawling, company research, people lookup, code context retrieval, and deep research workflows. Trigger when the user asks for deep web research, company/person intelligence, source-grounded findings, or broad internet discovery beyond basic search.
---

# Exa MCP Research Skill

Use the Exa MCP server endpoint:

`https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,get_code_context_exa,crawling_exa,company_research_exa,people_search_exa,deep_researcher_start,deep_researcher_check`

## Tool usage policy

- Start with `web_search_exa` for fast discovery.
- Use `web_search_advanced_exa` when filters/precision are needed.
- Use `crawling_exa` to extract page-level details from discovered URLs.
- Use `get_code_context_exa` for repository/code-aware context gathering.
- Use `company_research_exa` and `people_search_exa` for profile intelligence.
- Use `deep_researcher_start` for long-running research tasks.
- Poll with `deep_researcher_check` until completion.

## Recommended workflow

1. Define the research question and output format.
2. Run broad search to gather candidates.
3. Narrow and validate with advanced search/crawling.
4. Run deep researcher when synthesis requires multi-source breadth.
5. Return concise findings with source links and confidence caveats.

## Output standard

- Always include source links for factual claims.
- Distinguish confirmed facts vs inferred conclusions.
- Flag stale/uncertain sources.
- Prefer recent, primary sources when available.
