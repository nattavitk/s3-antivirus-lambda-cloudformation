#!/usr/bin/env bash

docker stop s3-antivirus-builder
docker rm s3-antivirus-builder

rm -rf clamav
rm -rf bin

