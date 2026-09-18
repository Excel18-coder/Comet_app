#!/bin/bash

# Comet MongoDB Setup Checklist
# Run this script to verify everything is configured correctly

echo "🔍 Comet MongoDB Setup Verification"
echo "===================================="
echo ""

# Check if .env exists in API server
if [ -f "artifacts/api-server/.env" ]; then
    echo "✅ .env file exists"
    if grep -q "MONGODB_URI" "artifacts/api-server/.env"; then
        echo "✅ MONGODB_URI is set"
    else
        echo "❌ MONGODB_URI not found in .env"
    fi
    if grep -q "ADMIN_API_TOKEN" "artifacts/api-server/.env"; then
        echo "✅ ADMIN_API_TOKEN is set"
    else
        echo "❌ ADMIN_API_TOKEN not found in .env"
    fi
else
    echo "❌ .env file missing in artifacts/api-server/"
    echo "   Create it with: cp artifacts/api-server/.env.example artifacts/api-server/.env"
fi

echo ""
echo "📦 Checking dependencies..."
if [ -d "artifacts/api-server/node_modules" ]; then
    echo "✅ node_modules exists"
    if [ -d "artifacts/api-server/node_modules/mongodb" ]; then
        echo "✅ mongodb package installed"
    else
        echo "❌ mongodb package not installed"
        echo "   Run: cd artifacts/api-server && pnpm install"
    fi
else
    echo "❌ Dependencies not installed"
    echo "   Run: cd artifacts/api-server && pnpm install"
fi

echo ""
echo "📄 Checking files..."
files=(
    "artifacts/api-server/src/lib/mongodb.ts"
    "artifacts/api-server/src/routes/signups.ts"
    "artifacts/comet-waitlist/src/App.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

echo ""
echo "🚀 Quick Start"
echo "============="
echo "1. Configure .env file:"
echo "   cd artifacts/api-server"
echo "   cat > .env << 'EOF'"
echo "   MONGODB_URI=\"mongodb+srv://baraka21404_db_user:R6l1zctNj0mA1AWd@cluster0.keffbk4.mongodb.net\""
echo "   ADMIN_API_TOKEN=\"your-secure-token-here\""
echo "   EOF"
echo ""
echo "2. Install dependencies:"
echo "   cd artifacts/api-server && pnpm install"
echo ""
echo "3. Start services:"
echo "   cd /path/to/project && pnpm run dev"
echo ""
echo "4. Test signup:"
echo "   curl -X POST http://localhost:5000/api/signups \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@example.com\",\"platforms\":[\"macOS\"],\"referral\":\"direct\"}'"
echo ""
echo "5. Access admin dashboard:"
echo "   http://localhost:5173/admin"
echo ""
echo "✅ Setup complete! Run 'pnpm run dev' to start."
