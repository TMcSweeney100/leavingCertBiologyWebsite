package ie.coursework.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientAddressResolverTest {

    private final ClientAddressResolver resolver = new ClientAddressResolver("s3cret");

    private MockHttpServletRequest request(String forwardedFor, String secret) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("76.76.21.21");
        if (forwardedFor != null) request.addHeader("X-Forwarded-For", forwardedFor);
        if (secret != null) request.addHeader("X-Proxy-Secret", secret);
        return request;
    }

    @Test
    void trustsTheForwardedAddressWhenTheProxySecretMatches() {
        assertThat(resolver.resolve(request("203.0.113.7", "s3cret"))).isEqualTo("203.0.113.7");
    }

    @Test
    void ignoresAForwardedAddressWithoutTheSecret() {
        assertThat(resolver.resolve(request("203.0.113.7", null))).isEqualTo("76.76.21.21");
        assertThat(resolver.resolve(request("203.0.113.7", "guess"))).isEqualTo("76.76.21.21");
    }

    @Test
    void takesOnlyTheFirstEntry() {
        assertThat(resolver.resolve(request("203.0.113.7, 10.0.0.1", "s3cret"))).isEqualTo("203.0.113.7");
    }

    @Test
    void trustsNothingWhenNoSecretIsConfigured() {
        assertThat(new ClientAddressResolver("").resolve(request("203.0.113.7", ""))).isEqualTo("76.76.21.21");
    }
}
