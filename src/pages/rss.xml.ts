import rss from "@astrojs/rss";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import type { APIRoute } from "astro";
import { ContentClient } from "../lib/blog";

export const GET: APIRoute = async (context) => {
  const { env } = context.locals.runtime;
  const clinet = new ContentClient(env.MICROCMS_API_KEY, env.KV);
  const posts = await clinet.getAllPosts();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? new URL("/"),
    items: posts.map((post) => ({
      pubDate: post.publishedAt ? new Date(post.publishedAt) : undefined,
      title: post.title,
      categories: post.category?.name ? [post.category?.name] : undefined,
      content: post.content,
      link: `/blog/${post.id}/`,
    })),
  });
};
