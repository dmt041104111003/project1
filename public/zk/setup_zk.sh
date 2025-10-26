#!/bin/bash

echo "=== Update system ==="
sudo apt update

echo "=== Install dependencies ==="
sudo apt install -y curl wget git build-essential

echo "=== Install Node.js (LTS) ==="
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== Install SnarkJS ==="
sudo npm install -g snarkjs

echo "=== Download Circom v2.1.8 ==="
wget https://github.com/iden3/circom/releases/download/v2.1.8/circom-linux-amd64 -O /usr/local/bin/circom
sudo chmod +x /usr/local/bin/circom

echo "=== Check Versions ==="
node -v
snarkjs --version
circom --version

echo "✅ Setup complete!"

