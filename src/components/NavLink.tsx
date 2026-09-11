"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps extends Omit<ComponentProps<typeof Link>, "className" | "href"> {
  className?: string | ((props: { isActive: boolean }) => string);
  activeClassName?: string;
  to?: string;
  href?: any;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, to, href, end, children, ...props }, ref) => {
    const pathname = usePathname() || "";
    const targetPath = href || to || "/";
    const isActive = end ? pathname === targetPath : pathname.startsWith(targetPath);

    const computedClassName =
      typeof className === "function"
        ? className({ isActive })
        : cn(className, isActive && activeClassName);

    return (
      <Link ref={ref} href={targetPath} className={computedClassName} {...props}>
        {typeof children === "function" ? (children as any)({ isActive }) : children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
