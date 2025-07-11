#!/bin/bash

# Generate PNG icons from SVG
# Requires ImageMagick or librsvg to be installed

echo "Generating Chrome extension icons..."

# Check if we have a tool to convert SVG to PNG
if command -v convert &> /dev/null; then
    # Use ImageMagick
    convert -background none -resize 16x16 icons/icon.svg icons/icon16.png
    convert -background none -resize 48x48 icons/icon.svg icons/icon48.png
    convert -background none -resize 128x128 icons/icon.svg icons/icon128.png
    echo "Icons generated using ImageMagick"
elif command -v rsvg-convert &> /dev/null; then
    # Use librsvg
    rsvg-convert -w 16 -h 16 icons/icon.svg -o icons/icon16.png
    rsvg-convert -w 48 -h 48 icons/icon.svg -o icons/icon48.png
    rsvg-convert -w 128 -h 128 icons/icon.svg -o icons/icon128.png
    echo "Icons generated using librsvg"
else
    echo "Error: No SVG to PNG converter found!"
    echo "Please install ImageMagick (brew install imagemagick) or librsvg (brew install librsvg)"
    echo ""
    echo "As a temporary solution, creating placeholder text files:"
    echo "PLACEHOLDER: 16x16 icon" > icons/icon16.png
    echo "PLACEHOLDER: 48x48 icon" > icons/icon48.png
    echo "PLACEHOLDER: 128x128 icon" > icons/icon128.png
    echo "Please replace these with actual PNG icons!"
fi 