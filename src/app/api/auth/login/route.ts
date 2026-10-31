import { cookies } from "next/headers";
import { z } from "zod";
import { checkOrigin, handleApi, HttpError } from "@/lib/server/errors";
import { getDatabase } from "@/lib/server/supabase";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleApi(async () => {
    checkOrigin(request);
    const input = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(await request.json());
    const { data, error } = await getDatabase().auth.signInWithPassword(input);
    if (error || !data.session) throw new HttpError(401, "UNAUTHORIZED", "Correo o contraseña incorrectos.");
    (await cookies()).set("javalimos-access", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in,
    });
    return { signedIn: true };
  });
}
