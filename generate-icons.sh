#!/bin/bash

# Create a 16x16 icon
convert -size 16x16 xc:transparent -fill '#6366F1' -draw 'circle 8,8 8,2' dist/icons/icon16.png

# Create a 48x48 icon
convert -size 48x48 xc:transparent -fill '#6366F1' -draw 'circle 24,24 24,6' dist/icons/icon48.png

# Create a 128x128 icon
convert -size 128x128 xc:transparent -fill '#6366F1' -draw 'circle 64,64 64,16' dist/icons/icon128.png 