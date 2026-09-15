package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class UsernameTest {

    @Test
    void parsingTrimsAndLowercasesWhatAPhoneKeyboardProduces() {
        assertThat(Username.parse("  Aoife.Byrne ").value()).isEqualTo("aoife.byrne");
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "a_b-c.1", "abcdefghijklmnopqrstuvwxyz012345"})
    void acceptsThreeToThirtyTwoAllowedCharacters(String raw) {
        assertThat(Username.parse(raw).value()).isEqualTo(raw);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "ab", "abcdefghijklmnopqrstuvwxyz0123456", "aoife byrne", "aoife@school", "séan"})
    void rejectsAnythingElse(String raw) {
        assertThatThrownBy(() -> Username.parse(raw))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode())
                .isEqualTo(ErrorCode.USERNAME_INVALID);
    }
}
