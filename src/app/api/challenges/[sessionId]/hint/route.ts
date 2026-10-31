import { checkOrigin, handleApi } from "@/lib/server/errors";
import { revealSessionHint } from "@/lib/server/challenges";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handleApi(async () => {
    checkOrigin(request);
    return revealSessionHint((await params).sessionId);
  });
}
