#!/bin/bash

pidfile=$1

pwd=$(pwd)
service=${pwd##*/}

if [ ! -f "$pidfile" ]
then
  echo "[$service] Service is not running - $pidfile"
  exit 0
fi

echo "[$service] Stopping Service - $pidfile. PID=$(cat $pidfile)"
kill -9 $(cat $pidfile)
rm $pidfile  
