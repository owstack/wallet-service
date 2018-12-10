#!/bin/bash

start_program=../scripts/start_program.sh

mkdir -p logs
mkdir -p pids

$start_program blockchainmonitor/blockchainmonitor.js pids/blockchainmonitor.pid logs/blockchainmonitor.log
$start_program emailservice/emailservice.js pids/emailservice.pid logs/emailservice.log
$start_program pushnotificationsservice/pushnotificationsservice.js pids/pushnotificationsservice.pid logs/pushnotificationsservice.log
