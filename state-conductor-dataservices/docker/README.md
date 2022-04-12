# State Conductor Container

## Build Container Image

    docker build -t state-conductor-driver:1.2.2 -t state-conductor-driver:latest .

## Run Driver Image

    docker run -it \
    --name=state-conductor-driver \
    -p 9000:9000 \
    -e mlHost=localhost \
    -e mlPort=8008 \
    -e username=admin \
    -e password=admin \
    -e securityContextType=digest \
    -e connectionType=direct \
    -e simpleSsl=false \
    -e pollSize=1000 \
    -e pollInterval=1000 \
    -e cooldownMillis=10000 \
    -e queueThreshold=20000 \
    -e batchSize=5 \
    -e metricsInterval=10000 \
    -e threadsPerHost=16 \
    -e maxThreadCount=128 \
    state-conductor-driver:latest
