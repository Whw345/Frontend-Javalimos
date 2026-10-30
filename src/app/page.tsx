import { redirect } from "next/navigation";
import { DEFAULT_COURSE_ID } from "@/lib/config";

// Sin /inicio todavía: la raíz lleva directo a los retos del curso por defecto.
export default function HomePage() {
  redirect(`/cursos/${DEFAULT_COURSE_ID}/jugar`);
}
