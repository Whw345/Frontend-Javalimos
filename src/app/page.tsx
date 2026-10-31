import { redirect } from "next/navigation";
import { API_MOCKING_ENABLED, DEFAULT_COURSE_ID } from "@/lib/config";

// Sin /inicio todavía: la raíz lleva directo a los retos del curso por defecto.
export default function HomePage() {
  redirect(API_MOCKING_ENABLED ? `/cursos/${DEFAULT_COURSE_ID}/jugar` : "/ingresar");
}
