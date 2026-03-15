/**
 * TabMind — Blocker (P1: Extension Systems Lead)
 *
 * Purpose: Classify tabs as work vs distraction and close/suppress distraction tabs
 * when Shield Mode is active. Used by background.js during Shield flow.
 *
 * TODO (P1):
 * - Define known distraction domains (e.g. youtube.com, reddit.com, x.com, twitter.com, instagram.com, tiktok.com).
 * - Implement isDistractionUrl(url) → boolean.
 * - Implement getTabsToClose(tabs) or similar: return list of tab IDs that are distractions.
 * - Optionally: allow suppression vs full close; integrate with background.js Shield step.
 */

"use strict";

const KNOWN_DISTRACTION_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "reddit.com",
  "www.reddit.com",
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "tiktok.com",
  "www.tiktok.com",
];

const WORK_HOSTS = [
  "github.com",
  "gitlab.com",
  "stackoverflow.com",
  "developer.mozilla.org",
  "developer.chrome.com",
  "docs.google.com",
  "drive.google.com",
  "figma.com",
  "notion.so",
  "notion.site",
  "linear.app",
  "jira.com",
  "atlassian.net",
  "localhost",
  "127.0.0.1",
  "canvas.instructure.com",
  "d2l.com",
];

const normalizeUrl = (url) => {
  return typeof url === "string" ? url : "";
};

const safeHostnameFromUrl = (url) => {
  try {
    if (!url) return "";
    return new URL(url).hostname || "";
  } catch {
    return "";
  }
};

const isDistractionUrl = (url) => {
  const hostname = safeHostnameFromUrl(url);
  if (!hostname) return false;

  return KNOWN_DISTRACTION_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
};

const isWorkUrl = (url) => {
  const hostname = safeHostnameFromUrl(url);
  if (!hostname) return false;

  return WORK_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
};

const classifyTab = (tab) => {
  const url = normalizeUrl(tab?.url);
  const distracting = isDistractionUrl(url);
  const work = isWorkUrl(url);

  return {
    tabId: tab?.id ?? null,
    title: tab?.title ?? "",
    url,
    category: distracting ? "distraction" : work ? "work" : "neutral",
  };
};

const getTabsToClose = (tabs) => {
  return tabs.filter((tab) => {
    if (!tab?.id) return false;
    if (tab?.pinned) return false;
    return isDistractionUrl(tab.url);
  });
};

const closeTabs = async (tabs) => {
  const tabIds = tabs.map((tab) => tab.id).filter(Boolean);
  if (tabIds.length === 0) return;

  await chrome.tabs.remove(tabIds);
};
