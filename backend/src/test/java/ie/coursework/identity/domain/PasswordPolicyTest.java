package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

    @Test
    void tenCharactersIsEnoughAndNoCompositionRulesApply() {
        assertThatCode(() -> PasswordPolicy.check("aaaaaaaaaa")).doesNotThrowAnyException();
    }

    @Test
    void nineCharactersIsTooShort() {
        assertCode(() -> PasswordPolicy.check("aaaaaaaaa"), ErrorCode.PASSWORD_TOO_SHORT);
        assertCode(() -> PasswordPolicy.check(null), ErrorCode.PASSWORD_TOO_SHORT);
    }

    @Test
    void sixtyFourCharactersIsTheMaximum() {
        assertThatCode(() -> PasswordPolicy.check("a".repeat(64))).doesNotThrowAnyException();
        assertCode(() -> PasswordPolicy.check("a".repeat(65)), ErrorCode.PASSWORD_TOO_LONG);
    }

    @Test
    void neverMoreThanSeventyTwoBytesBecauseBcryptReadsNoFurther() {
        // 20 four-byte emoji: 20 characters, 80 bytes.
        assertCode(() -> PasswordPolicy.check("😀".repeat(20)), ErrorCode.PASSWORD_TOO_LONG);
    }

    private static void assertCode(Runnable action, ErrorCode expected) {
        assertThatThrownBy(action::run)
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode())
                .isEqualTo(expected);
    }
}
