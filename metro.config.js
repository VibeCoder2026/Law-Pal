const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable asset plugins for PDFs
config.resolver.assetExts.push('pdf');

module.exports = config;