package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class TemporaryPasswordGeneratorTest {

    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator(new SecureRandom());

    @Test
    void sixteenCharactersWithNothingThatReadsAsSomethingElse() {
        String password = generator.next();

        assertThat(password).hasSize(16).doesNotContainPattern("[0O1lI]").matches("[A-Za-z2-9]+");
    }

    @Test
    void passesThePasswordPolicy() {
        PasswordPolicy.check(generator.next());
    }

    @Test
    void differsEachTime() {
        assertThat(generator.next()).isNotEqualTo(generator.next());
    }
}
