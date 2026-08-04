FROM gradle:8.7-jdk21 AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon
COPY src src
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
