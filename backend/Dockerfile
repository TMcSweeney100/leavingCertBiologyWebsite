# Build stage. Tests don't run here: they need Docker for Testcontainers, and `make verify` runs
# them before anything is pushed.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw --quiet dependency:go-offline
COPY src src
RUN ./mvnw --quiet -DskipTests package && cp target/coursework-backend-*.jar app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 coursework
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
USER coursework
ENV SERVER_ADDRESS=0.0.0.0 \
    SERVER_PORT=8080 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
