/** Origin that serves the static JSON API and image assets. */
export const API_ORIGIN = 'https://fifi.cooking';

/** Design canvas the whole UI is laid out against, then scaled to the viewport. */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export const LANG_STORAGE_KEY = 'fifi-tv:language';

/**
 * Packaged Tizen apps run from a file:// origin, and YouTube refuses embeds
 * without an HTTP referrer (player error 152/153). The player therefore
 * loads through a tiny relay page on our own HTTPS origin
 * (site/player.html → https://samsungsmarttv.fifi.cooking/player.html),
 * which hosts the YouTube IFrame API and accepts play/pause/stop commands
 * via postMessage.
 */
export const PLAYER_ORIGIN = 'https://samsungsmarttv.fifi.cooking';

export const playerUrl = (id: string, lang: string) =>
  `${PLAYER_ORIGIN}/player.html?v=${encodeURIComponent(id)}&hl=${encodeURIComponent(lang)}`;

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const youtubeThumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
