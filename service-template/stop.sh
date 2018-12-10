#!/bin/bash

stop_program="../scripts/stop_program.sh"

$stop_program pids/blockchainmonitor.pid
$stop_program pids/emailservice.pid
$stop_program pids/pushnotificationsservice.pid
