#!/usr/bin/env bash

set -euo pipefail

echo "🔧 [EAS Hook] Décoding GoogleService-Info.plist from environment variable..."

if [ -n "${GOOGLE_SERVICES_INFO_PLIST_BASE64:-}" ]; then
    echo "✅ Found GOOGLE_SERVICES_INFO_PLIST_BASE64 environment variable"
    
    # Decode base64 and write to ios/ directory
    echo "$GOOGLE_SERVICES_INFO_PLIST_BASE64" | base64 --decode > ios/GoogleService-Info.plist
    
    echo "✅ GoogleService-Info.plist created successfully at ios/GoogleService-Info.plist"
    ls -lh ios/GoogleService-Info.plist
else
    echo "⚠️  GOOGLE_SERVICES_INFO_PLIST_BASE64 not found in environment"
    exit 1
fi

