#!/usr/bin/env sh

set -eu
set +x # do not echo secrets

OPENVSX_TOKEN="${OPENVSX_TOKEN:?}"
VERSION="${VERSION:?}"
NAME="${NAME:?}"
PUBLISHER="${PUBLISHER:?}"

here="$(cd "$(dirname "$0")"; pwd)"
repo_root="$(realpath "$here/..")"
server_out="$repo_root/server/out"


REPO_ROOT="$repo_root" \
SERVER_OUT="$server_out" \
VERSION="$VERSION" \
NAME="$NAME" \
PUBLISHER="$PUBLISHER" \
"$here"/build-for-release.sh

cd "$repo_root"
extension="$(echo "./$NAME-"*.vsix)"
echo "Publishing $extension" | grep -vF '*' || {
	ls
	echo "No matching vsix file was found. (./$NAME-*.vsix)"
	exit 1
}
npm install ovsx
npx ovsx publish "$extension" -p "$OPENVSX_TOKEN"
