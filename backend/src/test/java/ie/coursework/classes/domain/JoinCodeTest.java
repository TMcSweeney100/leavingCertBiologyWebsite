package ie.coursework.classes.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class JoinCodeTest {

    private final SecureRandom random = new SecureRandom();

    @Test
    void generatesEightCharactersFromTheUnambiguousAlphabet() {
        for (int i = 0; i < 50; i++) {
            assertThat(JoinCode.generate(random).value()).hasSize(8).matches("[A-HJKMNP-Z2-9]{8}");
        }
    }

    @Test
    void differsEachTime() {
        assertThat(JoinCode.generate(random)).isNotEqualTo(JoinCode.generate(random));
    }

    @Test
    void parsingAcceptsWhatAStudentTypesOnAPhone() {
        assertThat(JoinCode.parse(" abcd efgh ")).contains(new JoinCode("ABCDEFGH"));
        assertThat(JoinCode.parse("ABCD-EFGH")).contains(new JoinCode("ABCDEFGH"));
    }

    @Test
    void parsingRejectsTheWrongLengthOrAlphabet() {
        assertThat(JoinCode.parse("ABCDEFG")).isEmpty();
        assertThat(JoinCode.parse("ABCD0EFG")).isEmpty();
        assertThat(JoinCode.parse("")).isEmpty();
        assertThat(JoinCode.parse(null)).isEmpty();
    }

    @Test
    void expiryIsThirtyDaysFromIssue() {
        Instant issued = Instant.parse("2026-10-01T09:00:00Z");
        assertThat(JoinCode.expiryFrom(issued)).isEqualTo(Instant.parse("2026-10-31T09:00:00Z"));
    }
}
