import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { createGatewayModel } from "./model";

afterEach(() => vi.unstubAllEnvs());

it("sends structured output through LangChain to AI Gateway in non-thinking mode", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "test",
        object: "chat.completion",
        created: 1,
        model: "alibaba/qwen3.7-flash",
        choices: [
          { index: 0, finish_reason: "stop", message: { role: "assistant", content: '{"topic":"Celulas"}' } },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  const result = await createGatewayModel(fetchImpl).generate(
    z.object({ topic: z.string() }),
    "Extrae el tema.",
    "Material de celulas",
  );
  expect(result).toEqual({ topic: "Celulas" });
  const [url, init] = fetchImpl.mock.calls[0]!;
  expect(String(url)).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
  const body = JSON.parse(String(init?.body));
  expect(body).toMatchObject({
    model: "alibaba/qwen3.7-flash",
    reasoning: { effort: "none" },
    response_format: { type: "json_schema" },
  });
  expect(body.messages[0].role).toBe("system");
  expect(body.messages[1].role).toBe("user");
});
