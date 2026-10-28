import Link from "next/link";
import { Home, LineChart, Percent, Receipt, ScanLine, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/receipts", label: "Recibos", icon: Receipt },
  { href: "/spending", label: "Gastos", icon: Wallet },
  { href: "/products", label: "Preços", icon: LineChart },
  { href: "/taxes", label: "Impostos", icon: Percent },
] as const;

// Tabs left of the scan button; the rest go to its right.
const LEFT_TABS = 3;

/** Presentational bar: renders in the static shell, with no highlight when `pathname` is null. */
export function NavBar({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur"
    >
      {/* 3 tabs | scan | 2 tabs: the right tabs are wider so the scan button stays centered. */}
      <ul className="mx-auto grid max-w-2xl grid-cols-[1fr_1fr_1fr_auto_1.5fr_1.5fr] items-end px-2 pb-[env(safe-area-inset-bottom)]">
        {links.slice(0, LEFT_TABS).map((l) => (
          <NavItem key={l.href} {...l} active={isActive(l.href)} />
        ))}
        <li className="flex justify-center pb-2">
          <Link
            href="/scan"
            aria-label="Escanear nota"
            className={cn(
              "-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background",
              isActive("/scan") && "ring-accent",
            )}
          >
            <ScanLine className="size-6" />
          </Link>
        </li>
        {links.slice(LEFT_TABS).map((l) => (
          <NavItem key={l.href} {...l} active={isActive(l.href)} />
        ))}
      </ul>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
          active ? "text-primary" : "text-muted",
        )}
      >
        <Icon className="size-5" />
        {label}
      </Link>
    </li>
  );
}
