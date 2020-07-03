# Alpine Linux with OpenJDK JRE
FROM openjdk:8-jre-alpine
# copy Driver files
COPY state-conductor-dataservices-0.6.1.jar /state-conductor-dataservices-0.6.1.jar
COPY test.properties /driver.properties
# runs application
CMD ["/usr/bin/java", "-jar", "/state-conductor-dataservices-0.6.1.jar", "--config", "driver.properties"]
