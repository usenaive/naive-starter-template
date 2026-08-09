import type { ChatCompletionRequest } from "@usenaive-sdk/node";
import { requireNaiveUser } from "@/lib/naive";

/**
 * A sensitive action that's gated by the user's Account Kit returns this shape
 * (HTTP 202) instead of executing. Detected locally so we don't depend on a
 * specific SDK version's helper.
 */
function isPendingApproval(
  res: unknown,
): res is { status: "pending_approval"; approval_id: string; action: string; title: string | null } {
  return (
    typeof res === "object" &&
    res !== null &&
    (res as { status?: unknown }).status === "pending_approval" &&
    typeof (res as { approval_id?: unknown }).approval_id === "string"
  );
}

/**
 * The headline reference: a tool-use loop powered entirely by
 * `naive.forUser(id).agentTools()`, with the LLM calls routed through Naive's
 * LLM primitive (a full wrapper over OpenRouter — 300+ models, one key). The
 * toolset comes straight from the SDK (nothing hardcoded here) and has two
 * lanes — third-party apps and built-in Naive primitives — all gated by the
 * user's Account Kit. Swap the model with NAIVE_LLM_MODEL.
 *
 * Streams NDJSON events to the client so the UI renders the reply token-by-token:
 *   {"type":"text","delta":"..."}      assistant text chunk
 *   {"type":"tool","name":...,"ok":..} a Naive tool ran
 *   {"type":"pending","id":...}        an approval-gated action was queued
 *   {"type":"error","error":...}       something failed
 *   {"type":"done"}                    stream finished
 */

const SYSTEM = `You are the in-app assistant for a demo SaaS built on Naive.
You have two distinct sets of tools — pick the right lane:

1) THIRD-PARTY APPS (external integrations the user connects via OAuth: Gmail,
   GitHub, Slack, Stripe, …). Use naive_search_apps to find an app, then
   naive_connect_app (give the user the returned link to authorize), then
   naive_list_capabilities and naive_run_capability to act.

2) BUILT-IN NAIVE PRIMITIVES (native platform features — NOT third-party apps:
   cards, email, domains, vault, verification/KYC, formation, social, approvals).
   These never appear in naive_search_apps. Use naive_search_primitives to
   discover them and their methods, then naive_run_primitive to execute. For
   requests like "issue a card", "create an inbox / send email from my Naive
   inbox", "buy a domain", or "store a secret", use this lane — do NOT search
   third-party apps.

Human-in-the-loop governance: some sensitive actions (issuing/funding a card,
purchasing a domain, KYC, forming a company, and connecting/signing up for a
3rd-party service) may REQUIRE the user's approval. When a tool result has
"status": "pending_approval", the action did NOT run — it is queued. Do not
retry it or pretend it succeeded. Instead, clearly tell the user it needs their
approval and ask them to review it in the Approvals tab. You can check status
with naive_run_primitive (primitive 'approvals', method 'list').
Be concise.`;

// Any OpenRouter model id works — routed + billed through Naive.
const MODEL = process.env.NAIVE_LLM_MODEL || "anthropic/claude-sonnet-4.6";
const MAX_TURNS = 6;

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
interface ChatMsg {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export async function POST(req: Request) {
  let client;
  try {
    ({ client } = await requireNaiveUser());
  } catch {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!process.env.NAIVE_API_KEY) {
    return new Response(JSON.stringify({ error: "NAIVE_API_KEY is not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const { messages: incoming } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const kit = client.agentTools(); // <-- Naive tools (incl. business primitives), ready for Claude

  // agentTools() returns Anthropic-format tool defs; map them to OpenAI-style
  // tools for the OpenRouter chat-completions API. handle() is format-agnostic.
  const tools = kit.tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    ...incoming.map((m) => ({ role: m.role, content: m.content })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          let text = "";
          const acc: Record<number, ToolCall> = {};

          // Stream one assistant turn through Naive's LLM router (OpenRouter).
          const body = { model: MODEL, max_tokens: 1024, tools, messages } as unknown as ChatCompletionRequest;
          for await (const chunk of client.llm.stream(body)) {
            const delta = chunk.choices?.[0]?.delta as
              | { content?: string | null; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> }
              | undefined;
            if (!delta) continue;
            if (delta.content) {
              text += delta.content;
              send({ type: "text", delta: delta.content });
            }
            for (const tc of delta.tool_calls ?? []) {
              const i = tc.index ?? 0;
              acc[i] ??= { id: "", type: "function", function: { name: "", arguments: "" } };
              if (tc.id) acc[i].id = tc.id;
              if (tc.function?.name) acc[i].function.name = tc.function.name;
              if (tc.function?.arguments) acc[i].function.arguments += tc.function.arguments;
            }
          }

          const toolCalls = Object.values(acc).filter((c) => c.function.name);
          const assistant: ChatMsg = { role: "assistant", content: text || null };
          if (toolCalls.length) assistant.tool_calls = toolCalls;
          messages.push(assistant);

          if (toolCalls.length === 0) {
            send({ type: "done" });
            controller.close();
            return;
          }

          for (const call of toolCalls) {
            let ok = true;
            let out: unknown;
            try {
              const input = call.function.arguments ? JSON.parse(call.function.arguments) : {};
              out = await kit.handle(call.function.name, input as Record<string, unknown>);
              if (isPendingApproval(out)) {
                send({ type: "pending", id: out.approval_id, action: out.action, title: out.title });
              }
            } catch (e) {
              ok = false;
              out = { error: e instanceof Error ? e.message : "tool failed" };
            }
            send({ type: "tool", name: call.function.name, ok });
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(out).slice(0, 12000),
            });
          }
        }

        send({ type: "text", delta: "\n\n_(I hit the tool-call limit for this turn. Try narrowing the request.)_" });
        send({ type: "done" });
        controller.close();
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "request failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
