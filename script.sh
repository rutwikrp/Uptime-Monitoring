#!/bin/bash

echo "making API directory"
mkdir api
mkdir api/routes
cd api/routes
touch monitors.js
cd ..
echo "Creating Database"
mkdir api/db
touch api/db/schema.sql
echo "Creating JSON package"
touch api/package.json

echo "Creating Workers"
mkdir workers
touch workers/worker.js
mkdir workers/utils
touch workers/utils/checker.js
echo "Crating Json Package"
touch workers/package.json

echo "Creating Shared folder"
mkdir shared
touch shared/db.js

touch .env
