#!/usr/bin/env bash
cd dist
rm *
cd ..
VERSION=$(npm version patch)
npm i
tsc -p ./
cd dist
git commit -m "$VERSION"
git push origin dist
