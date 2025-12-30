import { FastifyInstance } from "fastify";
import OpenAI from "openai";
import { tools } from "../../shared/tools";
import { toolHandlers } from "./toolHandlers";
import { instructionsTemplate } from "./instructions";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions";

interface SessionState {
  messages: ChatCompletionMessageParam[];
  lastUpdated: number;
}

export function whatsappService(app: FastifyInstance) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sessions = new Map<string, SessionState>();

  // Clear old sessions every 15mins
  setInterval(() => {
    const now = Date.now();
    for (const [phone, session] of sessions) {
      if (now - session.lastUpdated > 15 * 60 * 1000) {
        sessions.delete(phone);
      }
    }
  }, 60_000);

  const restaurant = {
    id: "5ca392be-af4c-42d6-91e4-343c1734dcde",
    name: "asdasd",
  };

  async function handleMessage(phone: string, text: string): Promise<string> {
  const session =
    sessions.get(phone) ?? { messages: [], lastUpdated: Date.now() };
  session.lastUpdated = Date.now();
  session.messages.push({ role: "user", content: text });

  let finalText = "";
  let running = true;

  // memory
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: instructionsTemplate({ restaurant, phone }) },
    ...session.messages,
  ];

  while (running) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
    });

    const choice = response.choices[0];
    const msg = choice.message;

    if (choice.finish_reason !== "tool_calls" || !msg.tool_calls) {
      finalText = msg.content ?? "";
      if (finalText) {
        messages.push({ role: "assistant", content: finalText });
        session.messages.push({ role: "assistant", content: finalText });
      }
      running = false;
      break;
    }

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const fn = call.function.name;
      const rawArgs = call.function.arguments ?? "{}";
      app.log.info(`🧰 Running tool: ${fn} with ${rawArgs}`);

      const args = JSON.parse(rawArgs);
      const handler =
        toolHandlers(app)[fn as keyof ReturnType<typeof toolHandlers>];
      if (!handler) {
        app.log.warn(`❌ Unknown tool: ${fn}`);
        continue;
      }

      let result: unknown;
      try {
        result = await handler(args);
      } catch (err: any) {
        app.log.error({ err }, `Tool execution failed: ${fn}`);
        result = { error: err.message ?? "Tool execution failed" };
      }

      messages.push(msg);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
      session.messages.push(msg);
      session.messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  session.lastUpdated = Date.now();
  sessions.set(phone, session);
  return finalText;
}

  return { handleMessage };
}