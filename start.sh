#!/bin/bash

if [ $# -eq 0 ]
  then
    echo "No service name specified. Provide a service name on the command line, e.g., btc"
fi

echo $1 | tr '[:upper:]' '[:lower:]'

source './'$1'-service/start.sh'
