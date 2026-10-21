import {
  homeResponseSchema,
  localeQuerySchema,
  slugSchema,
  toolDetailSchema,
  toolListResponseSchema,
} from "@anytools/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { notFound } from "../lib/http-error.js";

/** Public catalog read by the web app (server-side) to render pages. */
export const catalogRoutes: FastifyPluginAsyncZod = async (app) => {
  const { catalog, popularity } = app.services;

  app.get(
    "/catalog/home",
    { schema: { querystring: localeQuerySchema, response: { 200: homeResponseSchema } } },
    async (request) => catalog.home(request.query.locale, await popularity.top(16)),
  );

  app.get(
    "/catalog/tools",
    { schema: { querystring: localeQuerySchema, response: { 200: toolListResponseSchema } } },
    async (request) => ({ tools: await catalog.listTools(request.query.locale) }),
  );

  app.get(
    "/catalog/tools/:slug",
    {
      schema: {
        params: z.object({ slug: slugSchema }),
        querystring: localeQuerySchema,
        response: { 200: toolDetailSchema },
      },
    },
    async (request) => {
      const tool = await catalog.getTool(request.params.slug, request.query.locale);
      if (!tool) throw notFound("Tool not found");
      return tool;
    },
  );
};
