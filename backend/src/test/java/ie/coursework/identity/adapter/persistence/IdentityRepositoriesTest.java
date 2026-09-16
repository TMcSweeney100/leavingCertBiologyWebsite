package ie.coursework.identity.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.RoleGrant;
import ie.coursework.identity.domain.Username;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;

class IdentityRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private UserAccountRepository users;
    @Autowired private SchoolRepository schools;
    @Autowired private RoleRepository roles;

    @Test
    void storesAndFindsACredentialByNormalisedUsername() {
        UUID userId = users.insertUser("Aoife", "Byrne");
        users.insertCredential(userId, Username.parse("aoife.b"), "{bcrypt}hash", true);

        StoredCredential credential = users.findCredential(Username.parse("AOIFE.B")).orElseThrow();

        assertThat(credential.userId()).isEqualTo(userId);
        assertThat(credential.passwordHash()).isEqualTo("{bcrypt}hash");
        assertThat(credential.mustChange()).isTrue();
        assertThat(credential.disabled()).isFalse();
    }

    @Test
    void aTakenUsernameIsADuplicateKey() {
        users.insertCredential(users.insertUser("A", "B"), Username.parse("aoife.b"), "x", false);

        assertThatThrownBy(() -> users.insertCredential(users.insertUser("C", "D"), Username.parse("aoife.b"), "x", false))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void updatingAPasswordClearsOrSetsMustChange() {
        UUID userId = users.insertUser("Aoife", "Byrne");
        users.insertCredential(userId, Username.parse("aoife.b"), "old", true);

        users.updatePassword(userId, "new", false, Instant.parse("2026-10-01T09:00:00Z"));

        StoredCredential credential = users.findCredential(userId).orElseThrow();
        assertThat(credential.passwordHash()).isEqualTo("new");
        assertThat(credential.mustChange()).isFalse();
    }

    @Test
    void profileCarriesNameUsernameAndFlags() {
        UUID userId = users.insertUser("Aoife", "Byrne");
        users.insertCredential(userId, Username.parse("aoife.b"), "x", true);

        assertThat(users.findProfile(userId)).hasValueSatisfying(profile -> {
            assertThat(profile.firstName()).isEqualTo("Aoife");
            assertThat(profile.username()).isEqualTo("aoife.b");
            assertThat(profile.mustChange()).isTrue();
            assertThat(profile.disabled()).isFalse();
        });
    }

    @Test
    void grantingARoleTwiceIsANoOp() {
        UUID userId = users.insertUser("Ms", "Hanlon");
        UUID schoolId = schools.insert("North Wicklow ETSS", "76543A");

        assertThat(roles.grant(userId, schoolId, Role.TEACHER)).isTrue();
        assertThat(roles.grant(userId, schoolId, Role.TEACHER)).isFalse();
        assertThat(roles.grantsFor(userId))
                .containsExactly(new RoleGrant(schoolId, "North Wicklow ETSS", null, Role.TEACHER));
    }

    @Test
    void findsASchoolByRollNumber() {
        UUID schoolId = schools.insert("North Wicklow ETSS", "76543A");

        assertThat(schools.findByRollNumber("76543A")).hasValueSatisfying(s -> assertThat(s.id()).isEqualTo(schoolId));
        assertThat(schools.findByRollNumber("00000X")).isEmpty();
    }
}
