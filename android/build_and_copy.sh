#!/bin/bash
# Move to workspace root
cd "$(dirname "$0")/.."

echo "🚀 Building StitchLab offline-ready React Web App..."
npm run build

echo "📁 Creating Android local assets directory..."
mkdir -p android/app/src/main/assets/

echo "🧹 Cleaning up previous assets..."
rm -rf android/app/src/main/assets/*

echo "📦 Copying built files to Android assets folder..."
cp -r dist/* android/app/src/main/assets/

echo "✅ App files successfully prepared for android_asset loading!"
echo "You can now open the 'android' folder in Android Studio and build your native app."
