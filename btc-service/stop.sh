#!/bin/bash

stop_program ()
{
  pidfile=$1

  echo "Stopping Process - $pidfile. PID=$(cat $pidfile)"
  kill -9 $(cat $pidfile)
  rm $pidfile  
}

echo "Stopping network specific services, to stop base services run \`../base-service/stop\`"

stop_program pids/blockchainmonitor.pid
stop_program pids/fiatrateservice.pid
