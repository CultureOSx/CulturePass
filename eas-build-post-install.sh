#!/bin/bash
set -e

echo "[eas-build-post-install] Starting native config patch..."

# --- Android patches ---
if [ -f android/gradle.properties ]; then
  echo "[eas-build-post-install] Patching android/gradle.properties..."
  sed -i.bak 's/-Xmx[0-9]*m/-Xmx4096m/g' android/gradle.properties
  sed -i.bak 's/MaxMetaspaceSize=[0-9]*m/MaxMetaspaceSize=1024m/g' android/gradle.properties
  sed -i.bak 's/reactNativeArchitectures=.*/reactNativeArchitectures=armeabi-v7a,arm64-v8a/' android/gradle.properties
  echo "[eas-build-post-install] gradle.properties:"
  grep -E "jvmargs|Metaspace|reactNativeArch" android/gradle.properties
else
  echo "[eas-build-post-install] android/gradle.properties not found"
fi

if [ -f android/gradle/wrapper/gradle-wrapper.properties ]; then
  echo "[eas-build-post-install] Current Gradle wrapper:"
  cat android/gradle/wrapper/gradle-wrapper.properties
  # Downgrade from potentially new/uncached version to a known stable one
  # RN 0.83.x is compatible with Gradle 8.8+
  sed -i.bak 's|gradle-[0-9.]*-bin|gradle-8.8-bin|g' android/gradle/wrapper/gradle-wrapper.properties
  echo "[eas-build-post-install] Patched Gradle wrapper:"
  cat android/gradle/wrapper/gradle-wrapper.properties
else
  echo "[eas-build-post-install] gradle-wrapper.properties not found"
fi

echo "[eas-build-post-install] Done."
