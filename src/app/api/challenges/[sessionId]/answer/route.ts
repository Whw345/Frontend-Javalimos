import { z } from "zod";
import { checkOrigin, handleApi } from "@/lib/server/errors";
import { submitSession } from "@/lib/server/challenges";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handleApi(async () => {
    checkOrigin(request);
    const { answer } = z.object({ answer: z.unknown() }).parse(await request.json());
    return submitSession((await params).sessionId, answer);
  });
}
