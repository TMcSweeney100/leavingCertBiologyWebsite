package ie.coursework.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.login-limits")
public record LoginLimitsProperties(int perUsername, int perAddress, Duration window) {}
