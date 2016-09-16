#!/bin/bash

location=$(dirname $0) 

base_dir=$(cd "$location/.." && pwd)

asset_dir="$base_dir/assets"

version="0.0.0"

package="download.tar.gz"

url="https://github.com/random-cuber/jquery.hotkeys/archive/master.tar.gz"

rm -r -f "$asset_dir"
mkdir "$asset_dir"

download() {
    cd "$base_dir"
    wget "$url" -O "$package"
    tar xv --strip=1 --dir="$asset_dir" --file="$package" \
        --wildcards '*/jquery.hotkeys.js' '*/README.md'
    rm -r -f "$package"
}

download
