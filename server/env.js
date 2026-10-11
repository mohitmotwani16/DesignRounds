// Loads .env before any other server module reads process.env.
// (Done in code rather than with --env-file, which breaks --watch-path scoping when .env is absent.)
try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
