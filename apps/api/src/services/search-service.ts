import { SEARCH_PROVIDER_TIMEOUT_MS } from "@vibevault/config";
import type { ProviderId, SearchResult } from "@vibevault/types";
import {
  ProviderUnavailableError,
  providerRegistry,
} from "@vibevault/provider-core";
import type { SearchQuery, SearchResultPage } from "@vibevault/types";
import {
  assignRelevanceScores,
  boostQueryMatch,
  boostYouTubeMusicSignals,
  buildYouTubeQueriesFromHints,
  buildPaginationMeta,
  deduplicateSearchResults,
  filterYouTubeSearchResults,
  rankSearchResults,
} from "@vibevault/utils";
import { createRequestLogger } from "../lib/logger";

async function withProviderTimeout<T>(
  providerId: ProviderId,
  operation: Promise<T>,
  timeoutMs = SEARCH_PROVIDER_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new ProviderUnavailableError(
              providerId,
              new Error(`Provider timed out after ${timeoutMs}ms`),
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function dedupeByExternalId(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    const key = `${result.providerId}:${result.ref.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }

  return unique;
}

async function searchYouTubeWithCatalogHints(
  query: SearchQuery,
  catalogHints: SearchResult[],
): Promise<SearchResult[]> {
  const youtube = providerRegistry.get("youtube");
  if (!youtube) return [];

  const rawPage = await withProviderTimeout(
    "youtube",
    youtube.search({ ...query, types: ["track"] }),
  );
  const rawFiltered = filterYouTubeSearchResults(rawPage.results);

  const refinedQueries = buildYouTubeQueriesFromHints(
    catalogHints,
    query.query,
  );
  const refined: SearchResult[] = [];

  for (const refinedQuery of refinedQueries.slice(0, 3)) {
    try {
      const page = await withProviderTimeout(
        "youtube",
        youtube.search({
          ...query,
          query: refinedQuery,
          limit: Math.min(5, query.limit),
          types: ["track"],
        }),
        Math.min(SEARCH_PROVIDER_TIMEOUT_MS, 6_000),
      );
      refined.push(...filterYouTubeSearchResults(page.results));
    } catch {
      // Refined pass is best-effort; raw + catalog providers still contribute.
    }
  }

  const merged = dedupeByExternalId([
    ...assignRelevanceScores(refined).map((result) => ({
      ...result,
      relevanceScore: Math.min(1, (result.relevanceScore ?? 0.5) + 0.15),
    })),
    ...assignRelevanceScores(rawFiltered),
  ]);

  return boostYouTubeMusicSignals(merged);
}

export async function unifiedSearch(
  query: SearchQuery,
  requestId?: string,
): Promise<SearchResultPage> {
  const log = createRequestLogger(requestId ?? "search");
  const providers = providerRegistry.listSearchable();
  const catalogProviders = providers.filter((p) => p.id !== "youtube");
  const perProviderLimit = Math.max(
    5,
    Math.ceil(query.limit / Math.max(providers.length, 1)),
  );

  const settled = await Promise.allSettled(
    catalogProviders.map(async (provider) => {
      const page = await withProviderTimeout(
        provider.id,
        provider.search({
          ...query,
          types: ["track"],
        }),
      );
      return { providerId: provider.id, page };
    }),
  );

  const providersQueried: ProviderId[] = ["youtube"];
  const providersFailed: ProviderId[] = [];
  const catalogResults: SearchResult[] = [];

  for (let index = 0; index < settled.length; index += 1) {
    const provider = catalogProviders[index]!;
    const result = settled[index]!;

    providersQueried.push(provider.id);

    if (result.status === "fulfilled") {
      const providerResults = result.value.page.results.slice(
        0,
        perProviderLimit,
      );
      catalogResults.push(...assignRelevanceScores(providerResults));
      continue;
    }

    providersFailed.push(provider.id);
    log.warn(
      { providerId: provider.id, err: result.reason },
      "provider search failed",
    );
  }

  let youtubeResults: SearchResult[] = [];
  try {
    youtubeResults = await searchYouTubeWithCatalogHints(query, catalogResults);
  } catch (error) {
    providersFailed.push("youtube");
    log.warn({ err: error }, "youtube search failed");
  }

  const mergedResults = [...catalogResults, ...youtubeResults];
  const scored = boostQueryMatch(mergedResults, query.query);
  const deduped = deduplicateSearchResults(scored);
  const ranked = rankSearchResults(deduped);

  const start = (query.page - 1) * query.limit;
  const end = start + query.limit;
  const pageResults = ranked.slice(start, end);

  if (providersQueried.length > 0 && providersFailed.length === providersQueried.length) {
    throw new ProviderUnavailableError(
      providersFailed[0]!,
      new Error("All providers failed for unified search"),
    );
  }

  return {
    results: pageResults,
    meta: buildPaginationMeta(
      query.page,
      query.limit,
      pageResults.length,
      ranked.length,
    ),
    providersQueried,
    providersFailed,
  };
}
