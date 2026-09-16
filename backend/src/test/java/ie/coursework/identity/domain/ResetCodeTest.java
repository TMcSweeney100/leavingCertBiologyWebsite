package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ResetCodeTest {

    @Test
    void eightUnambiguousCharactersValidForADay() {
        ResetCode code = ResetCode.generate(new SecureRandom());

        assertThat(code.value()).hasSize(8).matches("[A-HJKMNP-Z2-9]{8}");
        assertThat(ResetCode.LIFETIME).isEqualTo(Duration.ofHours(24));
        assertThat(code.expiryFrom(Instant.parse("2026-10-01T09:00:00Z"))).isEqualTo(Instant.parse("2026-10-02T09:00:00Z"));
    }

    @Test
    void theHashIsStableAndForgivingAboutTyping() {
        ResetCode code = new ResetCode("ABCDEFGH");

        assertThat(code.hash()).isEqualTo(ResetCode.hashOf(" abcd-efgh "));
        assertThat(code.hash()).hasSize(64).doesNotContain("ABCDEFGH");
        assertThat(ResetCode.hashOf("ABCDEFGJ")).isNotEqualTo(code.hash());
    }
}
