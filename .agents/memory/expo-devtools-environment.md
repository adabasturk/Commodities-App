---
name: Expo DevTools environment
description: Non-blocking React Native DevTools warning observed in the Expo SDK 57 Replit workflow.
---

Expo SDK 57 can emit a missing `libglib-2.0.so.0` error while attempting to install React Native DevTools in the Replit container. Metro still starts, bundles the app, and serves Expo web preview normally.

**Why:** The native DevTools binary expects a system library that is not present in the container; treating this as a workflow failure would lead to unnecessary dependency changes.

**How to apply:** Check whether Metro reaches its QR/web URL and whether the bundle completes before investigating this warning. Only pursue it if the actual Expo preview or native debugging is broken.