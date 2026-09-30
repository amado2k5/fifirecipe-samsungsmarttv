#!/usr/bin/env bash
# Creates the Tizen CLI security profile used by `npm run package`.
#
#   Samsung certificates (Seller Office / real TVs) — recommended:
#     SAMSUNG_AUTHOR_P12=author.p12 SAMSUNG_DISTRIBUTOR_P12=distributor.p12 \
#     TIZEN_CERT_PASSWORD=... scripts/tizen-profile.sh
#   (create them once in Tizen Studio › Tools › Certificate Manager ›
#    Samsung certificate, signed in with your Samsung account; the distributor
#    certificate must list your TVs' DUIDs for on-device testing)
#
#   Development only (emulator; retail TVs and Seller Office reject it):
#     TIZEN_CERT_PASSWORD=... scripts/tizen-profile.sh --dev
#
# Profile name: $TIZEN_PROFILE (default "fifi").
set -euo pipefail
TIZEN="${TIZEN_CLI:-$(command -v tizen || echo "$HOME/tizen-studio/tools/ide/bin/tizen")}"
PROFILE="${TIZEN_PROFILE:-fifi}"
PASS="${TIZEN_CERT_PASSWORD:?set TIZEN_CERT_PASSWORD}"

"$TIZEN" security-profiles remove -n "$PROFILE" >/dev/null 2>&1 || true

if [[ "${1:-}" == "--dev" ]]; then
  AUTHOR="${TIZEN_DATA:-$HOME/tizen-studio-data}/keystore/author/fifi-dev.p12"
  [[ -f "$AUTHOR" ]] || "$TIZEN" certificate -a fifi-dev -p "$PASS" -c EG -o "FiFi Cooking" -n "FiFi Recipes Dev" -f fifi-dev
  "$TIZEN" security-profiles add -n "$PROFILE" -a "$AUTHOR" -p "$PASS"
else
  : "${SAMSUNG_AUTHOR_P12:?set SAMSUNG_AUTHOR_P12 (or pass --dev)}"
  : "${SAMSUNG_DISTRIBUTOR_P12:?set SAMSUNG_DISTRIBUTOR_P12}"
  "$TIZEN" security-profiles add -n "$PROFILE" -a "$SAMSUNG_AUTHOR_P12" -p "$PASS" \
    -d "$SAMSUNG_DISTRIBUTOR_P12" -dp "${TIZEN_DISTRIBUTOR_PASSWORD:-$PASS}"
fi
# Newer CLIs keep passwords in the OS keychain and prompt on package; store
# them in the profile file so non-interactive packaging (CI) works.
PROFILES_XML="$("$TIZEN" cli-config -l 2>/dev/null | sed -n 's/.*default.profiles.path=//p')"
if [[ -n "$PROFILES_XML" && -f "$PROFILES_XML" ]]; then
  # Only entries that point at a key file; empty slots stay empty.
  sed -i.bak "/key=\"[^\"][^\"]*\"/ s#password=\"\"#password=\"$PASS\"#" "$PROFILES_XML" && rm -f "$PROFILES_XML.bak"
fi
"$TIZEN" security-profiles list
