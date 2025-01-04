#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    exit 1
fi

# Base icon (you'll need to create this)
BASE_ICON="icon.png"

# Generate different sizes
convert "$BASE_ICON" -resize 16x16 icon16.png
convert "$BASE_ICON" -resize 32x32 icon32.png
convert "$BASE_ICON" -resize 48x48 icon48.png
convert "$BASE_ICON" -resize 128x128 icon128.png

echo "Icons generated successfully!" 