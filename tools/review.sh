#!/usr/bin/env bash
# Dev helper: captures a burst of one skill demo and tiles it into a sheet.
#   tools/review.sh <skill> <outdir> [frames] [every_ms] [start_ms] [target]
set -e
skill=$1; out=$2; n=${3:-12}; every=${4:-150}; start=${5:-3600}; target=${6:-0}
npx tsx tools/shots.ts "http://localhost:5173/?seed=3&demo=$skill&target=$target" "$out/$skill" "w$start,B$n:$every" 1280 720 | grep -v '^burst' || true
files=$(for i in $(seq 0 $((n-1))); do echo "$out/${skill}_$i.png"; done)
npx tsx tools/montage.ts "$out/${skill}_sheet.png" 4 $files
