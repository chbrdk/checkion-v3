/**
 * Central base URLs for external 3rd-party APIs.
 * Never hardcode API URLs in scanner or API routes.
 */

/** ip-api.com – Geo lookup by IP. Free for non-commercial. */
export const API_IP_API_BASE = 'http://ip-api.com';

/** SSL Labs API – SSL/TLS grade, certificates. Free with rate limits. */
export const API_SSL_LABS_BASE = 'https://api.ssllabs.com/api/v3';

/** Google PageSpeed Insights v5. Free (API key recommended for production). */
export const API_PAGESPEED_BASE = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5';

/** Wayback Machine – Domain availability/history. Free. */
export const API_WAYBACK_AVAILABLE = 'https://archive.org/wayback/available';

/** Serper – Google SERP API for rank tracking. Free tier ~2,500 requests/month. Base URL from env or default. */
export const API_SERP_BASE =
    (typeof process !== 'undefined' && process.env?.SERP_API_BASE)
        ? process.env.SERP_API_BASE.replace(/\/$/, '')
        : 'https://google.serper.dev';

/** ScrapingRobot – Google SERP API. Free tier ~5,000 requests/month. Single endpoint. */
export const API_SCRAPINGROBOT_BASE = 'https://api.scrapingrobot.com';

/**
 * The Green Web Foundation – hostname greencheck (optional; enable via env).
 * @see https://developers.thegreenwebfoundation.org/
 */
export const API_GREEN_WEB_GREENCHECK_BASE =
    (typeof process !== 'undefined' && process.env?.GREEN_WEB_API_BASE?.trim())
        ? process.env.GREEN_WEB_API_BASE.replace(/\/$/, '')
        : 'https://api.thegreenwebfoundation.org';
