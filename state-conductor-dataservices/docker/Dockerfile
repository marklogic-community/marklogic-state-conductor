# Alpine Linux with OpenJDK JRE
FROM openjdk:8-jre-alpine
# copy Driver files
COPY state-conductor-dataservices.jar /state-conductor-dataservices.jar
# specify environment configs
ENV mlHost=localhost
ENV mlPort=8888
ENV username=
ENV password=
ENV securityContextType=digest
ENV connectionType=direct
ENV simpleSsl=false
ENV externalName=
ENV certFile=
ENV certPassword=
ENV jobsDatabase=state-conductor-jobs
ENV flowNames=
ENV flowStatus=
ENV pollSize=1000
ENV pollInterval=1000
ENV cooldownMillis=5000
ENV queueThreshold=20000
ENV batchSize=5
ENV threadCount=10
ENV metricsInterval=5000
# runs application
CMD ["/usr/bin/java", "-jar", "/state-conductor-dataservices.jar"]
