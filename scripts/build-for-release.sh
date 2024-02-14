#!/usr/bin/env sh

set -eu
test "${TRACE_ON:-0}" -eq 1 && set -x

REPO_ROOT="${REPO_ROOT:?}"
SERVER_OUT="${SERVER_OUT:?}"
VERSION="${VERSION:?}"
NAME="${NAME:?}"
PUBLISHER="${PUBLISHER:?}"

fetch_include_past_h5p() {
	(
		trap 'rm -rf $tmp_path' EXIT
		tmp_path="$(mktemp -d)"
		download_path="$tmp_path/extension.vsix"
		# Download the latest version of the extension
		curl -sSL \
			"https://open-vsx.org/api/$PUBLISHER/$NAME/latest/file/download" \
			-o "$download_path"
		cd "$tmp_path"
		unzip -q "$download_path"
		files="$(find "$tmp_path" -name "*.tar.gz")"
		# There should only be one matching archive at the moment
		count="$(echo "$files" | awk '$0' | wc -l)"
		count_expected=1
		[ "$count" -eq "$count_expected" ] || {
			echo "ERROR: Expected $count_expected file(s), found $count"
			exit 1
		}
		# Move the files into the output for postbuild script to use
		echo "$files" | while read -r f; do mv "$f" "$SERVER_OUT"; done
	)
}

cd "$REPO_ROOT"
jq --arg version "$VERSION"  '. + {version: $version}' \
    package.json > package-with-version.json
mv package-with-version.json package.json
npm install
npm run clean
[ -z "${CLEAN_H5P:-}" ] && fetch_include_past_h5p
npm run package
