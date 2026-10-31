import { handleApi, HttpError } from "@/lib/server/errors";
import { getOwnedSession, publicSession } from "@/lib/server/challenges";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handleApi(async () => {
    const { sessionId } = await params;
    const { session, challenge } = await getOwnedSession(sessionId);
    if (session.answered_at) throw new HttpError(409, "ALREADY_ANSWERED", "El reto ya fue respondido.");
    return publicSession(session, challenge);
  });
}
