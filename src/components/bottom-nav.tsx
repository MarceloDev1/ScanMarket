"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./nav-bar";

/** Adds the active-tab highlight; needs the pathname, which is only known per request. */
export function ActiveNavBar() {
  return <NavBar pathname={usePathname()} />;
}
