#!/usr/bin/env bash
cd distcd
git reset --hard
git checkout dist
rm -r *
cd ..
VERSION=$(npm version patch)
npm i
tsc -p ./
cp package.json ./dist/package.json
cp package-lock.json ./dist/package-lock.json
cd dist
git add *
git commit -m "$VERSION"
git push origin dist
