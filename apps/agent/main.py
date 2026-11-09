"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

import hmac
import os
import warnings

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from copilotkit import CopilotKitMiddleware
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from deepagents import create_deep_agent

from src.anthropic_compat import ConsecutiveSystemMessagesMiddleware
from src.bounded_memory_saver import BoundedMemorySaver
from src.model import build_model, RequestModelMiddleware, CredentialScopedModel
from src.credentials import (
    CredentialsMiddleware,
    CredentialScopedAgent,
    current_credentials,
    validate_credentials,
)
from src.visualization_router import JevVisualizationMiddleware
from src.skill_backend import SKILL_SOURCES, build_agent_backend
from src.estore import search_products
from src.todos import AgentState, todo_tools
from src.form import generate_form
from src.trip_images import get_trip_stop_images
from src.plan import plan_visualization
from src.prompt import SYSTEM_PROMPT

load_dotenv()

agent = create_deep_agent(
    model=CredentialScopedModel(fallback=build_model(allow_unconfigured=True)),
    tools=[search_products, plan_visualization],
    middleware=[
        RequestModelMiddleware(),
        CopilotKitMiddleware(),
        JevVisualizationMiddleware(),
        ConsecutiveSystemMessagesMiddleware(),
    ],
    context_schema=AgentState,
    skills=SKILL_SOURCES,
    backend=build_agent_backend,
    checkpointer=BoundedMemorySaver(max_threads=200),
    system_prompt=SYSTEM_PROMPT,
)

app = FastAPI()
app.add_middleware(CredentialsMiddleware)


class AgentTokenMiddleware:
    """Estore: require x-agent-token (when AGENT_ACCESS_TOKEN is set) so only the chat app can call the agent."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        token = os.environ.get("AGENT_ACCESS_TOKEN", "").strip()
        if token and scope["type"] == "http" and scope["path"] != "/health":
            supplied = dict(scope.get("headers", [])).get(b"x-agent-token", b"").decode("latin-1")
            if not hmac.compare_digest(supplied, token):
                return await JSONResponse({"ok": False, "code": "unauthorized"}, status_code=401)(scope, receive, send)
        await self.app(scope, receive, send)


app.add_middleware(AgentTokenMiddleware)  # added last = runs first


@app.post("/credentials/validate")
async def validate_provider_credentials():
    credentials = current_credentials.get()
    if credentials is None:
        return JSONResponse({"ok": False, "code": "invalid_keys"}, status_code=400)
    return await validate_credentials(credentials)


@app.get("/health")
def health():
    return {"status": "ok"}


add_langgraph_fastapi_endpoint(
    app=app,
    agent=CredentialScopedAgent(
        name="sample_agent",
        description="Open Generative UI by CopilotKit — answers you can interact with",
        graph=agent,
    ),
    path="/",
)

warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8123"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
