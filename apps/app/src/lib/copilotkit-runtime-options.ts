import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";

import type { ProviderHeaders } from "./provider-keys";

class CredentialSafeLangGraphAgent extends LangGraphHttpAgent {
  protected override requestInit(input: Parameters<LangGraphHttpAgent["requestInit"]>[0]): RequestInit {
    // Custom credential headers survive cross-origin fetch redirects. Fail closed.
    return { ...super.requestInit(input), redirect: "error" };
  }
}

export interface RuntimeOptionsEnv {
  langgraphUrl?: string;
  mcpServerUrl?: string;
  providerHeaders?: ProviderHeaders;
}

// Normalize Render's fromService hostport (bare host:port) into a full URL
export function normalizeLanggraphUrl(raw?: string): string {
  if (!raw) return "http://localhost:8123";
  return raw.startsWith("http") ? raw : `http://${raw}`;
}

export function buildRuntimeOptions(env: RuntimeOptionsEnv) {
  return {
    agents: {
      default: new CredentialSafeLangGraphAgent({
        url: normalizeLanggraphUrl(env.langgraphUrl),
        // Estore: shared token so only this app can call the deployed agent
        headers: {
          ...(env.providerHeaders ?? {}),
          ...(process.env.AGENT_ACCESS_TOKEN && { "x-agent-token": process.env.AGENT_ACCESS_TOKEN }),
        },
      }),
    },
    a2ui: { injectA2UITool: false }, // Estore: compare products in plain text, no A2UI tables
    openGenerativeUI: true as const,
    ...(env.mcpServerUrl && {
      mcpApps: {
        servers: [{
          type: "http" as const,
          url: env.mcpServerUrl,
          serverId: "example_mcp_app",
        }],
      },
    }),
  };
}
