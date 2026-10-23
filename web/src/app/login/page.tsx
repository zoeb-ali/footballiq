import { redirect } from "next/navigation";

/** The persona picker is gone: the app opens directly. Old links still work. */
export default function LoginRedirect() {
  redirect("/app/overview");
}
