import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Sair"
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted hover:text-foreground"
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </form>
  );
}
