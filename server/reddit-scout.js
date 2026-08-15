/**
 * Sir Scout's ride into Reddit — pulls candidate story ideas from Reddit's own
 * public RSS feeds (e.g. reddit.com/r/AskReddit/top/.rss), NOT the reddit.com/*.json
 * endpoints. Those JSON endpoints 403 outright from this environment (confirmed via
 * curl — datacenter-IP anti-bot blocking, not a code bug); the RSS feeds are a
 * first-class, Reddit-supported syndication format and return 200.
 *
 * RSS trade-offs vs the JSON API:
 *   - No score/comment counts are exposed — only title, permalink, author, and
 *     publish date. Reddit's own "top" sort already ranks each subreddit's list,
 *     so candidates carry that rank instead of a numeric score.
 *   - Tightly rate-limited per-IP when unauthenticated (observed: a second request
 *     within ~2s of the first returns 429). Subreddits are fetched SEQUENTIALLY
 *     with a delay between requests, not in parallel like the old JSON approach.
 */

const USER_AGENT = 'camelot-scout/0.1 (local faceless-content pipeline; contact: local-dev)';
const REQUEST_SPACING_MS = 1500;
const FETCH_TIMEOUT_MS = 8000;

const DEFAULT_SUBREDDITS = ['AskReddit', 'TIFU', 'AmItheAsshole', 'nosleep', 'confession'];

function cleanSubreddit(sub) {
  return String(sub || '').trim().replace(/^\/?r\//i, '').replace(/\/+$/, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch() has no built-in timeout, and Reddit has been observed to silently drop
 * a connection (no response, no error) rather than cleanly answer with 403/429
 * after enough requests from one IP — without this, one bad request hangs the
 * whole scout run indefinitely.
 */
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Unescape the handful of XML entities Reddit's feed generator actually emits. */
function decodeEntities(str) {
  return String(str || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Reddit's Atom feed is machine-generated with a fixed, predictable shape, so a
 * small regex parse is reliable here without pulling in a full XML dependency.
 */
function parseEntries(xml) {
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const title = decodeEntities((/<title>([\s\S]*?)<\/title>/.exec(block) || [])[1]);
    const link = (/<link href="([^"]+)"/.exec(block) || [])[1];
    const published = (/<published>([^<]+)<\/published>/.exec(block) || [])[1] || null;
    if (title && link) entries.push({ title, link, published });
  }
  return entries;
}

/** Fetch one subreddit's top RSS feed, handling the 429 rate limit with one retry. */
async function fetchSubreddit(subreddit, { limit }) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/top/.rss?limit=${limit}`;
  let res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429) {
    // Cap the observed reset wait — Reddit can report a reset far longer than
    // this single subreddit is worth blocking the whole scout run for.
    const resetSec = Math.min(Number(res.headers.get('x-ratelimit-reset')) || 3, 15);
    await sleep((resetSec + 0.5) * 1000);
    res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } });
  }
  if (!res.ok) {
    throw new Error(`r/${subreddit} returned ${res.status}`);
  }
  return parseEntries(await res.text());
}

function toCandidate(entry, subreddit, rank) {
  return {
    title: entry.title,
    sourceUrl: entry.link,
    subreddit,
    rank,
    publishedAt: entry.published,
  };
}

/**
 * Scout a set of subreddits for candidate story ideas.
 * @param {object} opts
 * @param {string[]} [opts.subreddits] — defaults to DEFAULT_SUBREDDITS
 * @param {number} [opts.limit] — posts to pull per subreddit (default 10)
 * @returns {Promise<{ candidates: object[], errors: string[] }>}
 */
export async function scoutIdeas({ subreddits, limit = 10 } = {}) {
  const subs = (Array.isArray(subreddits) && subreddits.length ? subreddits : DEFAULT_SUBREDDITS)
    .map(cleanSubreddit)
    .filter(Boolean);

  const errors = [];
  const candidates = [];
  for (let i = 0; i < subs.length; i++) {
    if (i > 0) await sleep(REQUEST_SPACING_MS);
    try {
      const entries = await fetchSubreddit(subs[i], { limit });
      entries.forEach((entry, idx) => candidates.push(toCandidate(entry, subs[i], idx + 1)));
    } catch (err) {
      errors.push(`${subs[i]}: ${err.message}`);
    }
  }

  return { candidates, errors };
}
