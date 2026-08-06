"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  blogCategories,
  blogPosts,
  type BlogPost,
} from "@/lib/blog-content";
import { cn } from "@/lib/utils";

import { BlogCover } from "./blog-cover";

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="group relative flex min-h-[500px] flex-col overflow-hidden rounded-lg bg-white p-2 shadow-card ring-1 ring-line transition-shadow duration-500 hover:shadow-code">
      <Link
        href={`/blog/${post.slug}`}
        aria-label={`Read ${post.title}`}
        className="absolute inset-0 z-10"
      />
      <BlogCover
        alt={post.title}
        src={post.image}
        className="aspect-[4/3] rounded-md bg-cover"
      />
      <div className="flex flex-1 flex-col px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-4 text-[11px] font-medium uppercase text-signa-500">
          <time dateTime={post.publishedAt}>{post.dateLabel}</time>
          <span>{post.readingTime}</span>
        </div>
        <h2 className="mt-3 text-base font-medium leading-6 text-ink">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-copy">
          {post.excerpt}
        </p>
        <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium text-ink">
          Read further
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </span>
      </div>
    </article>
  );
}

export function BlogIndexClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const visiblePosts = useFilteredPosts(query, category);
  const searchResults = useFilteredPosts(query, "All");

  return (
    <>
      <div className="flex items-center gap-2 py-2">
        <Dialog onOpenChange={(open) => !open && setQuery("")}>
          <DialogTrigger
            render={
              <button
                type="button"
                aria-label="Search articles"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-signa-50 text-ink transition hover:bg-signa-100"
              />
            }
          >
            <Search className="size-4" />
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="top-8 max-h-[calc(100svh-4rem)] max-w-2xl -translate-y-0 gap-0 overflow-hidden rounded-none bg-transparent p-0 ring-0"
          >
            <DialogTitle className="sr-only">Search the Signa journal</DialogTitle>
            <DialogDescription className="sr-only">
              Find articles by title, topic, or description.
            </DialogDescription>
            <div className="site-gutter w-full p-4">
              <div className="border-x border-line bg-white p-4">
                <label className="relative block">
                  <span className="sr-only">Search posts</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-copy" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search posts..."
                    className="h-10 w-full rounded-lg border border-transparent bg-signa-100 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-signa-500 focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint"
                  />
                </label>
                {query.trim() ? (
                  <div className="mt-2 max-h-[calc(100svh-10rem)] overflow-y-auto bg-white">
                    {searchResults.length > 0 ? (
                      searchResults.slice(0, 8).map((post) => (
                        <Link
                          key={post.slug}
                          href={`/blog/${post.slug}`}
                          className="block px-4 py-4 transition hover:bg-signa-50 focus:bg-signa-50 focus:outline-none"
                        >
                          <h2 className="font-medium text-ink">{post.title}</h2>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-copy">
                            {post.excerpt}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-copy">
                        No articles match &quot;{query}&quot;.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div
          className="flex gap-3 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filter articles by category"
        >
          {blogCategories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 text-sm capitalize transition-colors",
                category === item
                  ? "font-medium text-ink"
                  : "text-copy hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line py-4">
        {visiblePosts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {visiblePosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 items-center justify-center text-center">
            <div>
              <p className="font-semibold text-ink">No matching articles</p>
              <button
                type="button"
                onClick={() => setCategory("All")}
                className="mt-2 text-sm font-medium text-signa-700 hover:text-signa-900"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function useFilteredPosts(query: string, category: string) {
  return useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return blogPosts.filter((post) => {
      const matchesCategory =
        category === "All" || post.category === category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${post.title} ${post.excerpt} ${post.category}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);
}
