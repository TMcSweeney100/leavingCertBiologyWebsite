package ie.coursework.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ErrorCodeTest {

    @Test
    void typeIsAStableUrnDerivedFromTheName() {
        assertThat(ErrorCode.CSRF_TOKEN_INVALID.type()).isEqualTo("urn:coursework:problem:csrf-token-invalid");
    }

    @Test
    void everyCodeHasATitleAndAnErrorStatus() {
        for (ErrorCode code : ErrorCode.values()) {
            assertThat(code.title()).as(code.name()).isNotBlank();
            assertThat(code.status().isError()).as(code.name()).isTrue();
        }
    }
}
