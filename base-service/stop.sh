#!/bin/bash

stop_program ()
{
  pidfile=$1

  echo "Stopping Process - $pidfile. PID=$(cat $pidfile)"
  kill -9 $(cat $pidfile)
  rm $pidfile  
}

echo "Stopping base services, to stop network specific services run \`../<network>-service/stop\` where <network> is \`btc\`, for example"

stop_program pids/ws.pid
stop_program pids/emailservice.pid
stop_program pids/pushnotificationsservice.pid
stop_program pids/messagebroker.pid
stop_program pids/locker.pid
