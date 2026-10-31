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

it("returns a reply that breaks the schema so callers can keep its valid parts", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  const reply = { good: { topic: "Celulas" }, bad: { topic: "x".repeat(50) } };
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "test",
        object: "chat.completion",
        created: 1,
        model: "alibaba/qwen3.7-flash",
        choices: [
          { index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(reply) } },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  const entry = z.object({ topic: z.string().max(10) });
  const schema = z.object({ good: entry, bad: entry });
  const model = createGatewayModel(fetchImpl);
  await expect(model.complete(schema, "Extrae.", "Material")).resolves.toEqual(reply);
  await expect(model.generate(schema, "Extrae.", "Material")).rejects.toThrow();
});

it("waits and retries when AI Gateway answers with its rate limit", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "0.001" } }))
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "test",
          object: "chat.completion",
          created: 1,
          model: "alibaba/qwen3.7-flash",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: { role: "assistant", content: '{"topic":"Celulas"}' },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
  const schema = z.object({ topic: z.string() });
  await expect(createGatewayModel(fetchImpl).complete(schema, "Extrae.", "Material")).resolves.toEqual({
    topic: "Celulas",
  });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});
