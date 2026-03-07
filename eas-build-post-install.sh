#!/bin/bash
set -e

# Modify the EAS-generated android/gradle.properties to prevent OOM
# during Gradle build with New Architecture + Hermes enabled.
# android/ is gitignored (managed workflow), so changes must happen here
# after expo prebuild generates the native directories.

if [ -f android/gradle.properties ]; then
  echo "[eas-build-post-install] Patching android/gradle.properties..."

  # Raise daemon JVM heap from 2048m to 4096m
  sed -i.bak 's/-Xmx[0-9]*m/-Xmx4096m/g' android/gradle.properties
  sed -i.bak 's/MaxMetaspaceSize=[0-9]*m/MaxMetaspaceSize=1024m/g' android/gradle.properties

  # Drop emulator architectures — Play Store only needs arm
  sed -i.bak 's/reactNativeArchitectures=.*/reactNativeArchitectures=armeabi-v7a,arm64-v8a/' android/gradle.properties

  echo "[eas-build-post-install] gradle.properties after patch:"
  grep -E "jvmargs|Metaspace|reactNativeArch" android/gradle.properties
else
  echo "[eas-build-post-install] android/gradle.properties not found, skipping patch"
fi
