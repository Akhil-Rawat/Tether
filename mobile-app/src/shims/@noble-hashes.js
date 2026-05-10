// Shim to route @noble/hashes root imports to the safe submodule implementations.
// This avoids the "root module cannot be imported" runtime throw in web builds.

let impl = null;
try {
  // Prefer the official sha256 subpath which provides a synchronous API.
  impl = require('@noble/hashes/sha256');
} catch (e) {
  // swallow; will export a fallback that throws with a helpful message.
}

if (impl && (impl.sha256 || impl.default)) {
  // If the submodule exported the function either as named or default, re-export it.
  module.exports = impl;
} else {
  module.exports = {
    sha256() {
      throw new Error(
        "@noble/hashes shim: no sha256 implementation available for web. Ensure @noble/hashes/sha256 is resolvable or use a WebCrypto/Node fallback."
      );
    },
  };
}
