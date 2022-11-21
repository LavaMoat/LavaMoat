#!/bin/sh

# exit when any command fails
set -e

# read args
package="$1"
packageDest="$2"

echoerr() { printf "%s\n" "$*" >&2; }

# version=$(npm show ${package} version)
tempdir=$(mktemp -d)
archive="${tempdir}/package.tgz"
url=$(npm view ${package} dist.tarball)
curl --fail --silent "$url" > $archive
mkdir -p $packageDest
tar xzf "${archive}" --strip-components 1 -C "${packageDest}"
rm "${archive}"
# echo "${archive}"

echoerr "wrote to ${packageDest}"
