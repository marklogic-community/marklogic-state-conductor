#!/bin/bash
for (( ; ; ))
do
  echo "processing executions [ hit CTRL+C to stop]"
  java -server -cp .:./libs/marklogic-xcc-10.0.3.jar:./libs/marklogic-corb-2.4.6.jar -DOPTIONS-FILE=corbDriver.properties com.marklogic.developer.corb.Manager "$@"
  code=$?
  if [ $code -eq 0 ]
  then
    continue
  elif [ $code -eq 3 ]
  then
    echo "no executions to process, sleeping 15 seconds..."
    sleep 15s
    continue
  else
    break
  fi
done
