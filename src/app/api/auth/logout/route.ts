import { cookies } from "next/headers";
import { checkOrigin, handleApi } from "@/lib/server/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    checkOrigin(request);
    (await cookies()).delete("javalimos-access");
    return { signedOut: true };
  });
}
