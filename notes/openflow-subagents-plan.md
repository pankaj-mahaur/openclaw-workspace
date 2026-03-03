# OpenFlow Sub-Agent Plan

## Active sub-agents
1. **Searcher** (`agents/searcher`)
   - Finds latest free/trial model offers and limits
   - Maintains ranked catalog
2. **Tester** (`agents/tester`)
   - Tests API key + config validity
   - Writes PASS/FAIL state into runtime state

## Master config
- `config/openflow/master-config.json`
- `config/openflow/runtime-state.json`
- `config/openflow/free-model-catalog.json`

## Core scripts
- `scripts/openflow/tester.js`
- `scripts/openflow/controller.js`

## Manual commands
```bash
# check routing candidates
node scripts/openflow/controller.js status

# auto-select best currently healthy + keyed candidate
node scripts/openflow/controller.js select

# test one account/model
node scripts/openflow/tester.js --provider openai --model openai-codex/gpt-5.3-codex --account gmail_1

# gateway controls
node scripts/openflow/controller.js gateway status
node scripts/openflow/controller.js gateway start
node scripts/openflow/controller.js gateway stop
node scripts/openflow/controller.js gateway restart
```
