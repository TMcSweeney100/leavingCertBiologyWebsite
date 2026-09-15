package ie.coursework.shared.web;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health as seen through the proxy. Shallow on purpose: it answers "is the API process reachable
 * from Next.js". The host's own check uses /actuator/health, which includes the database.
 */
@RestController
public class HealthController {

    @GetMapping("/api/v1/health")
    Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
