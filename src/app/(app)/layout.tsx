import { Suspense } from "react";
import { ActiveNavBar } from "@/components/bottom-nav";
import { NavBar } from "@/components/nav-bar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      {/* The bar is part of the static shell; only the highlight waits for the pathname. */}
      <Suspense fallback={<NavBar pathname={null} />}>
        <ActiveNavBar />
      </Suspense>
    </>
  );
}
