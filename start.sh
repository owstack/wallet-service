#!/bin/bash

# The list of all available services
baseservice="base"
allservices=( "bch" "btc" "ltc" )

if [ $# -eq 0 ]
then
  printf "usage: start [all"
  for i in "${allservices[@]}"
  do
    printf " | "$i
  done
  printf "]\n\n"
  exit 0
fi

# run_service (name)
start_service ()
{
  name=$1-service

  if [ ! -d "./$name/" ]
  then
    echo "$name is not a recognized service"
    exit 0
  fi

  cd "./"${name}"/"
  ./start.sh
  cd ..
}

# Start base services
start_service $baseservice

# Start coin network services
if [ $1 == "all" ]
then
  # Start all services
  for i in "${allservices[@]}"
  do
    start_service $i
  done
else
  # Start one service
  start_service $1
fi
