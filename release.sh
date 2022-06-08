#!/usr/bin/env bash
cd dist
git reset --hard
git checkout dist
rm -r *
cd ..
git checkout master
git reset --hard
git pull
npm ci
node_modules/eslint/bin/eslint.js  --ext .ts src
tsc -p ./
VERSION=$(npm version patch)
npm i
cp package.json ./dist/package.json
cp package-lock.json ./dist/package-lock.json
cp README.md ./dist/README.md
cd dist
git add *
git commit -m "$VERSION"
git push release dist
npm publish
cd ..
