// Developer tools (e.g. switching your own account between Free and Plus) are on in
// development and can be turned off with DEV_TOOLS=false. They are always off in
// production, where their routes are not mounted at all.
export const devToolsEnabled = process.env.NODE_ENV !== "production" && process.env.DEV_TOOLS !== "false";
