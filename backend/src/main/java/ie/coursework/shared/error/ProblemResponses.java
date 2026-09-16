package ie.coursework.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes a problem response directly, for security filters that reject a request before it
 * reaches a controller. Same shape as {@link ProblemDetailsAdvice}.
 */
@Component
public class ProblemResponses {

    private final ObjectMapper objectMapper;

    public ProblemResponses(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletRequest request, HttpServletResponse response, ErrorCode code, String detail)
            throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", code.type());
        body.put("title", code.title());
        body.put("status", code.status().value());
        body.put("detail", detail);
        body.put("instance", request.getRequestURI());
        body.put("code", code.name());
        body.put("fieldErrors", List.of());

        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
