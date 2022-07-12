/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  serverBuildTarget: "cloudflare-pages",
  server: "./server.js",
  // devServerBroadcastDelay: 1000,
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "src",
  // assetsBuildDirectory: "../public/build",
  serverBuildPath:
    process.env.NODE_ENV === "production"
      ? "../functions/[[path]].js"
      : undefined,
  // publicPath: "/build/",
  // devServerPort: 8002
};
