#!/bin/bash

# Stock Valuation App - iOS App Store Deployment Guide
# Complete step-by-step walkthrough for deploying to Apple App Store

echo "📱 Stock Valuation App - iOS App Store Deployment"
echo "================================================================"
echo ""

# Prerequisites
echo "✅ STEP 1: Prerequisites"
echo "---"
echo "You need:"
echo "  ✓ Apple Developer account ($99/year)"
echo "  ✓ Mac with Xcode (installed)"
echo "  ✓ Xcode Command Line Tools"
echo "  ✓ Backend deployed (Render URL ready)"
echo ""
echo "Install Xcode Command Line Tools if needed:"
echo "  xcode-select --install"
echo ""
read -p "Press Enter once you have Apple Developer account..."
echo ""

# Step 2: Prepare app
echo "✅ STEP 2: Prepare App for Release"
echo "---"
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app/mobile"

echo "1. Update app version in app.json:"
echo ""
echo '   {
     "expo": {
       "version": "1.0.0",
       "ios": {
         "bundleIdentifier": "com.yourname.stockvaluation"
       }
     }
   }'
echo ""
read -p "Press Enter after updating app.json..."
echo ""

# Step 3: EAS Build
echo "✅ STEP 3: Create Release Build with EAS"
echo "---"
echo "Make sure you're logged in to EAS:"
echo ""
echo "  eas login"
echo ""
echo "Then build for iOS:"
echo ""
echo "  eas build --platform ios --auto-submit"
echo ""
echo "This will:"
echo "  - Build your iOS app"
echo "  - Create release signing certificate"
echo "  - Generate .ipa file"
echo ""
read -p "Press Enter after EAS build completes..."
echo ""

# Step 4: TestFlight (Beta Testing)
echo "✅ STEP 4: Beta Testing with TestFlight"
echo "---"
echo "Your app is now in TestFlight for beta testing!"
echo ""
echo "To invite testers:"
echo "  1. Go to App Store Connect"
echo "  2. Select your app → TestFlight → iOS Builds"
echo "  3. Click the build number"
echo "  4. Add testers (email addresses)"
echo "  5. Send beta invitation link"
echo ""
echo "Wait at least 24 hours for beta testing."
echo ""
read -p "Press Enter once beta testing is complete..."
echo ""

# Step 5: App Store Submission
echo "✅ STEP 5: Submit to App Store"
echo "---"
echo "Prepare your app listing:"
echo ""
echo "Required information:"
echo "  - App Name: Stock Valuation"
echo "  - Description: AI-powered stock valuation and market analysis tool"
echo "  - Category: Finance"
echo "  - Keywords: stocks, valuation, investing, market"
echo "  - Support URL: your-website.com"
echo "  - Privacy Policy URL: your-website.com/privacy"
echo ""
echo "Required screenshots (for each iPhone size):"
echo "  - 1 home screen screenshot"
echo "  - 1 analysis screen screenshot"
echo "  - 1 watchlist screenshot"
echo "  - 1 market analysis screenshot"
echo ""
echo "Required app icons:"
echo "  - 1024x1024 png (for App Store)"
echo ""
read -p "Press Enter once you have all materials ready..."
echo ""

# Step 6: Submit
echo "✅ STEP 6: Final Submission"
echo "---"
echo "In App Store Connect:"
echo ""
echo "  1. Go to Your App → App Information"
echo "  2. Fill in all required fields"
echo "  3. Set pricing (free)"
echo "  4. Add App Privacy"
echo "  5. Select build to submit"
echo "  6. Click 'Submit for Review'"
echo ""
echo "Apple reviews your app (usually 24-48 hours)"
echo "You'll get email when approved or rejected"
echo ""
read -p "Press Enter after submission..."
echo ""

# Final
echo "================================================================"
echo "✅ iOS App Store Deployment Complete!"
echo "================================================================"
echo ""
echo "What happens next:"
echo "  1. Apple reviews your app (24-48 hours)"
echo "  2. If approved: App goes live on App Store"
echo "  3. Users can download from App Store"
echo ""
echo "If rejected, you'll get feedback to fix."
echo ""
