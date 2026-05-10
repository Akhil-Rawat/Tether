const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Provide a resolver alias so web builds use our safe shim instead of the
// package root which intentionally throws at runtime in some @noble packages.
config.resolver.extraNodeModules = config.resolver.extraNodeModules || {};
config.resolver.extraNodeModules['@noble/hashes'] = path.resolve(
  projectRoot,
  'src/shims/@noble-hashes.js'
);

module.exports = config;