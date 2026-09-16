package ie.coursework.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.support.TestAccounts;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * MockMvc parses cookies but isn't a browser. This runs the servlet container on a real port and
 * passes cookies by hand, so each assertion names exactly which credential was sent.
 */
@SpringBootTest(webEnvironment = RANDOM_PORT)
class SessionFlowTest extends PostgresIntegrationTest {

    @LocalServerPort private int port;
    @Autowired private TestAccounts accounts;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void signInUseTheCookieAndSignOut() throws Exception {
        UUID userId = accounts.user("aoife.b");

        HttpResponse<String> csrf = send(HttpRequest.newBuilder(uri("/api/v1/auth/csrf")).GET(), List.of());
        String xsrfCookie = cookie(csrf, "XSRF-TOKEN");
        String token = xsrfCookie.substring("XSRF-TOKEN=".length());

        String body = "{\"username\":\"aoife.b\",\"password\":\"%s\"}".formatted(TestAccounts.PASSWORD);

        HttpResponse<String> withoutHeader = send(HttpRequest.newBuilder(uri("/api/v1/auth/login"))
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)), List.of(xsrfCookie));
        assertThat(withoutHeader.statusCode()).isEqualTo(403);

        HttpResponse<String> login = send(HttpRequest.newBuilder(uri("/api/v1/auth/login"))
                .header("content-type", "application/json")
                .header("x-xsrf-token", token)
                .POST(HttpRequest.BodyPublishers.ofString(body)), List.of(xsrfCookie));
        assertThat(login.statusCode()).isEqualTo(200);

        String setCookie = login.headers().allValues("set-cookie").stream()
                .filter(value -> value.startsWith("SESSION=")).findFirst().orElseThrow();
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax").contains("Secure").contains("Path=/");
        String session = setCookie.split(";", 2)[0];

        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM spring_session WHERE principal_name = ?", Integer.class, userId.toString()))
                .as("the session is in Postgres, indexed by user id").isEqualTo(1);

        assertThat(send(HttpRequest.newBuilder(uri("/api/v1/auth/me")).GET(), List.of()).statusCode()).isEqualTo(401);
        assertThat(send(HttpRequest.newBuilder(uri("/api/v1/auth/me")).GET(), List.of(session)).statusCode()).isEqualTo(200);

        HttpResponse<String> logout = send(HttpRequest.newBuilder(uri("/api/v1/auth/logout"))
                .header("x-xsrf-token", token)
                .POST(HttpRequest.BodyPublishers.noBody()), List.of(session, xsrfCookie));
        assertThat(logout.statusCode()).isEqualTo(204);

        assertThat(send(HttpRequest.newBuilder(uri("/api/v1/auth/me")).GET(), List.of(session)).statusCode())
                .as("the same cookie is worth nothing after logout").isEqualTo(401);
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> send(HttpRequest.Builder request, List<String> cookies) throws Exception {
        if (!cookies.isEmpty()) {
            request.header("cookie", String.join("; ", cookies));
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String cookie(HttpResponse<?> response, String name) {
        return response.headers().allValues("set-cookie").stream()
                .filter(value -> value.startsWith(name + "="))
                .map(value -> value.split(";", 2)[0])
                .findFirst().orElseThrow();
    }
}
