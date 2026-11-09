# Estore AI Assistant

A fork of [CopilotKit/OpenIntelligentUI](https://github.com/CopilotKit/OpenIntelligentUI) (MIT) adapted into a shopping
assistant for the Estore MERN store. The original README is kept in `README.md`.

## What was changed from upstream

| Area | Change |
| --- | --- |
| Model | Added Gemini (`gemini-*` via `langchain-google-genai`) in `apps/agent/src/model.py` and `credentials.py` |
| Data | Replaced the sample-CSV `query_data` tool with `search_products` (`apps/agent/src/estore.py`), which calls the Estore backend's `/api/semanticSearch` (MongoDB Atlas vector search, Gemini embeddings). Supports budget filters |
| UI | `product-cards.tsx` renders the tool result as product cards (the model writes no HTML for products); internal Deep Agent tools are hidden |
| Prompt | Estore shopping rules: must-have budget/features, honest "no match", single search per message, Markdown comparison tables |
| Config | Key-gate bypass (`NEXT_PUBLIC_SERVER_KEYS`), A2UI injection off, telemetry off (`DO_NOT_TRACK=1`) |

## Environment

`apps/agent` (Python agent):

```
GOOGLE_API_KEY=            # Gemini
LLM_MODEL=gemini-3.5-flash-lite
TYPESAFE_API_KEY=          # Jev visualization router
JEV_MODEL=jev-latest
ESTORE_API_URL=https://<estore-backend>/api
ESTORE_STORE_URL=https://<estore-frontend>
ESTORE_ASSISTANT_KEY=      # shared secret, must equal ASSISTANT_API_KEY on the Estore backend
```

`apps/app` (Next.js):

```
LANGGRAPH_DEPLOYMENT_URL=https://<agent-url>
NEXT_PUBLIC_SERVER_KEYS=true
DO_NOT_TRACK=1
```

## Run locally

```
pnpm install
pnpm --filter @repo/design-system build
# agent (Python 3.12): create a venv, pip install -r apps/agent/requirements.txt, then
cd apps/agent && python -m uvicorn main:app --port 8123
# app
cd apps/app && pnpm dev
```
