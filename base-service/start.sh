#!/bin/bash

start_program=../scripts/start_program.sh

mkdir -p logs
mkdir -p pids

$start_program locker/locker.js pids/locker.pid logs/locker.log
$start_program messagebroker/messagebroker.js pids/messagebroker.pid logs/messagebroker.log
$start_program fiatrateservice/fiatrateservice.js pids/fiatrateservice.pid logs/fiatrateservice.log
$start_program ws.js pids/ws.pid logs/ws.log
