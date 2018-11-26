#!/bin/bash

mkdir -p logs
mkdir -p pids

# run_program (nodefile, pidfile, logfile)
run_program ()
{
  nodefile=$1
  pidfile=$2
  logfile=$3

  if [ -e "$pidfile" ]
  then
    echo "$nodefile is already running. Run 'npm stop' if you wish to restart."
    return 0
  fi

  nohup node $nodefile >> $logfile 2>&1 &
  PID=$!
  if [ $? -eq 0 ]
  then
    echo "Successfully started $nodefile. PID=$PID. Logs are at $logfile"
    echo $PID > $pidfile
    return 0
  else
    echo "Could not start $nodefile - check logs at $logfile"
    exit 1
  fi
}

# start coin network specific services
run_program blockchainmonitor/blockchainmonitor.js pids/blockchainmonitor.pid logs/blockchainmonitor.log
run_program emailservice/emailservice.js pids/emailservice.pid logs/emailservice.log
run_program messagebroker/messagebroker.js pids/messagebroker.pid logs/messagebroker.log
run_program pushnotificationsservice/pushnotificationsservice.js pids/pushnotificationsservice.pid logs/pushnotificationsservice.log

# start base services
../base-service/start.sh
