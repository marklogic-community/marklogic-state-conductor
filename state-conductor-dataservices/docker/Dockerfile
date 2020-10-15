# Alpine Linux with OpenJDK JRE
FROM openjdk:8-jre-alpine
# copy Driver files
COPY state-conductor-dataservices.jar /state-conductor-dataservices.jar
# specify environment configs
ENV mlHost=localhost
ENV mlPort=8888
ENV appServicesPort=8000
ENV username=
ENV password=
ENV securityContextType=digest
ENV connectionType=direct
ENV simpleSsl=false
ENV externalName=
ENV certFile=
ENV certPassword=
ENV executionDatabase=state-conductor-executions
ENV names=
ENV status=
ENV pollSize=1000
ENV pollInterval=1000
ENV cooldownMillis=5000
ENV queueThreshold=20000
ENV metricsInterval=5000
ENV batchSize=5
ENV fixedThreadCount=-1
ENV threadsPerHost=16
ENV maxThreadCount=128
# runs application
CMD ["/usr/bin/java", "-jar", "/state-conductor-dataservices.jar"]
