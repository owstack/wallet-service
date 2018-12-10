#!/bin/bash

nodefile=$1
pidfile=$2
logfile=$3

pwd=$(pwd)
service=${pwd##*/}

if [ -e "$pidfile" ]
then
  echo "[$service] Service is already running, $nodefile. PID=$(cat $pidfile)."
  exit 0
fi

nohup node $nodefile >> $logfile 2>&1 &
PID=$!

if [ $? -eq 0 ]
then
  echo "[$service] Successfully started $nodefile. PID=$PID. Logs are at $logfile"
  echo $PID > $pidfile
  exit 0
else
  echo "[$service] Could not start $nodefile - check logs at $logfile"
  exit 1
fi
