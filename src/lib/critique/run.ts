import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SYSTEM_PROMPT, buildUserText } from "./prompt";
import { type Critique, type CritiqueRequest, CritiqueSchema } from "./schema";

/** Claude Haiku 5.5: the cheapest current model with vision, at about $0.001 per review. */
export const DEFAULT_MODEL = "claude-haiku-5-5";

export type CritiqueErrorCode = "refused" | "incomplete" | "unparseable";

export class CritiqueError extends Error {
  constructor(
    readonly code: CritiqueErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CritiqueError";
  }
}

export type CritiqueResult = {
  critique: Critique;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
};

/** The one part of the SDK client this module uses, so tests can pass a fake. */
export type MessagesClient = Pick<Anthropic, "messages">;

export async function runCritique(
  client: MessagesClient,
  request: CritiqueRequest,
  model = DEFAULT_MODEL,
): Promise<CritiqueResult> {
  const response = await client.messages.parse({
    model,
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium", format: zodOutputFormat(CritiqueSchema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: request.image.mediaType, data: request.image.data } },
          { type: "text", text: buildUserText(request) },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new CritiqueError("refused", "The AI declined to review this image.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new CritiqueError("incomplete", "The review was cut off before it finished.");
  }
  if (!response.parsed_output) {
    throw new CritiqueError("unparseable", "The review came back in an unexpected format.");
  }

  return {
    critique: response.parsed_output,
    model: response.model,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
