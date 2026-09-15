package ie.coursework.support;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * One browser, as far as MockMvc can be one: a cookie jar that updates from every response, and the
 * CSRF header on every unsafe request, fetched from /auth/csrf the first time it's needed.
 *
 * <p>This goes through the real filter chain — Spring Session, CSRF, the security context — rather
 * than MockMvc's {@code csrf()} and {@code with(user(...))} shortcuts, which skip exactly the parts
 * most likely to be misconfigured. Each session gets its own client address so login throttling in
 * one test can't leak into another.
 */
public final class ApiSession {

    private final MockMvc mockMvc;
    private final Map<String, Cookie> jar = new LinkedHashMap<>();
    private final String address = "10.%d.%d.%d".formatted(
            ThreadLocalRandom.current().nextInt(256), ThreadLocalRandom.current().nextInt(256),
            ThreadLocalRandom.current().nextInt(1, 255));

    public ApiSession(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    public ApiSession login(String username, String password) throws Exception {
        post("/api/v1/auth/login", "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password))
                .andExpect(status().isOk());
        return this;
    }

    public ResultActions get(String path) throws Exception {
        return perform(MockMvcRequestBuilders.get(path));
    }

    public ResultActions post(String path, String json) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.post(path).contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    public ResultActions post(String path) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.post(path)));
    }

    public ResultActions put(String path, String json) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.put(path).contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    public ResultActions patch(String path, String json) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.patch(path).contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    public ResultActions delete(String path) throws Exception {
        return perform(withCsrf(MockMvcRequestBuilders.delete(path)));
    }

    public Optional<String> cookie(String name) {
        return Optional.ofNullable(jar.get(name)).map(Cookie::getValue);
    }

    private MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder builder) throws Exception {
        if (!jar.containsKey("XSRF-TOKEN")) {
            perform(MockMvcRequestBuilders.get("/api/v1/auth/csrf")).andExpect(status().isNoContent());
        }
        return builder.header("X-XSRF-TOKEN", jar.get("XSRF-TOKEN").getValue());
    }

    private ResultActions perform(MockHttpServletRequestBuilder builder) throws Exception {
        if (!jar.isEmpty()) {
            builder.cookie(jar.values().toArray(Cookie[]::new));
        }
        builder.with(request -> {
            request.setRemoteAddr(address);
            return request;
        });
        ResultActions result = mockMvc.perform(builder);
        for (Cookie cookie : result.andReturn().getResponse().getCookies()) {
            if (cookie.getMaxAge() == 0) {
                jar.remove(cookie.getName());
            } else {
                jar.put(cookie.getName(), cookie);
            }
        }
        return result;
    }
}
