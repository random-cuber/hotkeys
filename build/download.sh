#!/bin/bash

keys_save() {
    echo "keys_save"
    local url="https://github.com/random-cuber/jquery.hotkeys/archive/master.tar.gz"
    local package="hotkeys.tar.gz"
    wget "$url" -O "$package"
    tar xv --strip=1 --dir="$keys_dir" --file="$package" \
        --wildcards '*/jquery.hotkeys.js' '*/README.md'
    rm -rf "$package"
}

font_open() {
    echo "font_open"
    curl \
        --silent --show-error --fail --output .fontello \
        --form "config=@$font_dir/config.json" \
        ${font_host}
}

font_save() {
    echo "font_save"
    rm -rf .fontello.src .fontello.zip
    curl \
        --silent --show-error --fail --output .fontello.zip \
        ${font_host}/$(cat .fontello)/get
    unzip .fontello.zip -d .fontello.src
    rm -rf "$font_dir"/*
    mv .fontello.src/fontello-*/* "$font_dir"
}

font_clean() {
    echo "font_clean"
    rm -rf .fontello*
}

location=$(dirname $0) 
base_dir=$(cd "$location/.." && pwd)
asset_dir="$base_dir/assets"

font_host="http://fontello.com"

font_dir="$asset_dir/fontello"
keys_dir="$asset_dir/hotkeys"

mkdir -p "$font_dir" "$keys_dir"

cd "$base_dir"

keys_save

font_open
font_save
font_clean
