"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  DocsNavGroup,
  DocsNavLink,
} from "@/components/docs/docs-nav-links";

export function DocsSidebarNav({
  groups,
}: {
  groups: DocsNavGroup[];
}) {
  const pathname = usePathname();
  const links = useDocsNavLinks(groups);
  const activeHash = useActiveDocsHash(pathname, links);

  return (
    <nav className="flex-1 overflow-y-auto px-6 py-6">
      <DocsNavGroups
        activeHash={activeHash}
        groups={groups}
        pathname={pathname}
      />
    </nav>
  );
}

function DocsNavGroups({
  activeHash,
  groups,
  pathname,
}: {
  activeHash: string;
  groups: DocsNavGroup[];
  pathname: string;
}) {
  return (
    <>
      {groups.map((group, index) => (
        <DocsNavGroup
          activeHash={activeHash}
          className={index === 0 ? undefined : "mt-8"}
          key={group.label}
          label={group.label}
          links={group.links}
          pathname={pathname}
        />
      ))}
    </>
  );
}

function DocsNavGroup({
  activeHash,
  className,
  label,
  links,
  pathname,
}: {
  activeHash: string;
  className?: string;
  label: string;
  links: DocsNavLink[];
  pathname: string;
}) {
  return (
    <div className={className}>
      <p className="mb-3 text-sm font-black text-foreground">{label}</p>
      <div className="border-l border-border pl-3">
        {links.map((link) => (
          <DocsNavItem
            active={isDocsLinkActive(pathname, activeHash, link.href)}
            key={link.href}
            link={link}
          />
        ))}
      </div>
    </div>
  );
}

function DocsNavItem({
  active,
  link,
}: {
  active: boolean;
  link: DocsNavLink;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        active && "bg-secondary text-foreground"
      )}
      href={link.href}
    >
      {link.label}
    </Link>
  );
}

function useActiveDocsHash(pathname: string, links: DocsNavLink[]) {
  const sectionIds = useDocsSectionIds(pathname, links);
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    if (sectionIds.length === 0) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(syncActiveSection);

    function syncActiveSection() {
      const currentHash = findCurrentSectionHash(sectionIds);
      setActiveHash(currentHash || window.location.hash);
    }

    window.addEventListener("hashchange", syncActiveSection);
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("hashchange", syncActiveSection);
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
    };
  }, [sectionIds]);

  return sectionIds.length > 0 ? activeHash : "";
}

function useDocsNavLinks(
  groups: DocsNavGroup[],
) {
  return useMemo(() => groups.flatMap((group) => group.links), [groups]);
}

function useDocsSectionIds(pathname: string, links: DocsNavLink[]) {
  return useMemo(
    () =>
      links
        .map((link) => getLinkParts(link.href))
        .filter((link) => link.path === pathname && link.hash)
        .map((link) => link.hash.slice(1)),
    [links, pathname],
  );
}

function findCurrentSectionHash(sectionIds: string[]) {
  const scrollOffset = 120;
  const currentSection = sectionIds
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => Boolean(element))
    .filter((element) => element.getBoundingClientRect().top <= scrollOffset)
    .at(-1);

  return currentSection ? `#${currentSection.id}` : "";
}

function getLinkParts(href: string) {
  const [path, hash] = href.split("#");

  return {
    hash: hash ? `#${hash}` : "",
    path,
  };
}

function isDocsLinkActive(pathname: string, activeHash: string, href: string) {
  const { hash: hrefHash, path: hrefPath } = getLinkParts(href);

  if (hrefPath === "/docs") {
    return pathname === "/docs";
  }

  if (hrefHash) {
    return pathname === hrefPath && activeHash === hrefHash;
  }

  if (activeHash && pathname === hrefPath) {
    return false;
  }

  if (hrefPath === "/guides" || hrefPath === "/resources") {
    return pathname === hrefPath;
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}
