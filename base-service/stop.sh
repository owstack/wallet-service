#!/bin/bash

stop_program="../scripts/stop_program.sh"

$stop_program pids/ws.pid
$stop_program pids/fiatrateservice.pid
$stop_program pids/messagebroker.pid
$stop_program pids/locker.pid
