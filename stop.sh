#!/bin/bash

# The list of all available services
baseservice="base"
allservices=( "bch" "btc" "ltc" )

if [ $# -eq 0 ]
then
  printf "usage: stop [all"
  for i in "${allservices[@]}"
  do
    printf " | "$i
  done
  printf "]\n\n"
  exit 0
fi

# run_service (name)
stop_service ()
{
  name=$1-service

  if [ ! -d "./$name/" ]
  then
    echo "$name is not a recognized service"
    exit 0
  fi

  cd "./"${name}"/"
  ./stop.sh
  cd ..
}

# Start coin network services
if [ $1 == "all" ]
then
  for i in "${allservices[@]}"
  do
    stop_service $i
  done

  # Stop all services
	stop_service $baseservice
else
  # Stop one service
  stop_service $1
fi
