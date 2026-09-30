#!/usr/bin/env bash
# Creates the Tizen CLI security profile used by `npm run package`.
#
#   Samsung certificates (real TVs / Seller Office) — create them once in
#   Tizen Studio › Tools › Certificate Manager › Samsung (signed in with your
#   Samsung account; the distributor certificate lists your test TVs' DUIDs):
#     SAMSUNG_AUTHOR_P12=author.p12 SAMSUNG_DISTRIBUTOR_P12=distributor.p12 \
#     TIZEN_CERT_PASSWORD=... [TIZEN_DISTRIBUTOR_PASSWORD=...] scripts/tizen-profile.sh
#
#   Development only (Tizen emulator; retail TVs and Seller Office reject it):
#     TIZEN_CERT_PASSWORD=... scripts/tizen-profile.sh --dev
#
# The profile file is written directly with inline passwords so packaging
# works headless — the CLI's own `security-profiles add` stores passwords in
# the desktop keyring, which CI runners don't have. Keep TIZEN_DATA private.
set -euo pipefail
TIZEN="${TIZEN_CLI:-$(command -v tizen || echo "$HOME/tizen-studio/tools/ide/bin/tizen")}"
SDK="$(cd "$(dirname "$TIZEN")/../../.." && pwd)"          # …/tizen-studio
DATA="${TIZEN_DATA:-$(dirname "$SDK")/tizen-studio-data}"
PROFILE="${TIZEN_PROFILE:-fifi}"
PASS="${TIZEN_CERT_PASSWORD:?set TIZEN_CERT_PASSWORD}"
DIST_DIR="$SDK/tools/certificate-generator/certificates/distributor"

if [[ "${1:-}" == "--dev" ]]; then
  AUTHOR="$DATA/keystore/author/fifi-dev.p12"
  [[ -f "$AUTHOR" ]] || "$TIZEN" certificate -a fifi-dev -p "$PASS" -c EG -o "FiFi Cooking" -n "FiFi Recipes Dev" -f fifi-dev >/dev/null
  DIST="$DIST_DIR/tizen-distributor-signer.p12"
  DIST_PASS="tizenpkcs12passfordsigner" # public password of the SDK's test distributor
  DIST_CA="$DIST_DIR/tizen-distributor-ca.cer"
else
  AUTHOR="$(cd "$(dirname "${SAMSUNG_AUTHOR_P12:?set SAMSUNG_AUTHOR_P12 (or pass --dev)}")" && pwd)/$(basename "$SAMSUNG_AUTHOR_P12")"
  DIST="$(cd "$(dirname "${SAMSUNG_DISTRIBUTOR_P12:?set SAMSUNG_DISTRIBUTOR_P12}")" && pwd)/$(basename "$SAMSUNG_DISTRIBUTOR_P12")"
  DIST_PASS="${TIZEN_DISTRIBUTOR_PASSWORD:-$PASS}"
  DIST_CA=""
fi
[[ -f "$AUTHOR" && -f "$DIST" ]] || { echo "certificate file missing: $AUTHOR / $DIST" >&2; exit 1; }

xml_escape() { sed -e 's/&/\&amp;/g' -e 's/"/\&quot;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<<"$1"; }
mkdir -p "$DATA/profile"
PROFILES_XML="$DATA/profile/profiles.xml"
cat > "$PROFILES_XML" <<XML
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<profiles active="$PROFILE" version="3.1">
<profile name="$PROFILE">
<profileitem ca="" distributor="0" key="$AUTHOR" password="$(xml_escape "$PASS")" rootca=""/>
<profileitem ca="$DIST_CA" distributor="1" key="$DIST" password="$(xml_escape "$DIST_PASS")" rootca=""/>
<profileitem ca="" distributor="2" key="" password="" rootca=""/>
</profile>
</profiles>
XML
chmod 600 "$PROFILES_XML"
"$TIZEN" cli-config "default.profiles.path=$PROFILES_XML" >/dev/null
"$TIZEN" security-profiles list
