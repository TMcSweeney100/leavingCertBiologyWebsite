package ie.coursework.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ActorTest {

    private static final UUID SCHOOL_A = UUID.randomUUID();
    private static final UUID SCHOOL_B = UUID.randomUUID();

    private final Actor yearHead = new Actor(UUID.randomUUID(), List.of(
            new RoleGrant(SCHOOL_A, "School A", null, Role.TEACHER),
            new RoleGrant(SCHOOL_A, "School A", null, Role.SCHOOL_LEADER)));

    @Test
    void oneActorCanHoldSeveralRoles() {
        assertThat(yearHead.holds(Role.TEACHER)).isTrue();
        assertThat(yearHead.holds(Role.SCHOOL_LEADER)).isTrue();
        assertThat(yearHead.holds(Role.STUDENT)).isFalse();
    }

    @Test
    void aRoleIsHeldAtASpecificSchool() {
        assertThat(yearHead.holds(Role.TEACHER, SCHOOL_A)).isTrue();
        assertThat(yearHead.holds(Role.TEACHER, SCHOOL_B)).isFalse();
        assertThat(yearHead.schoolsWhere(Role.SCHOOL_LEADER)).containsExactly(SCHOOL_A);
    }

    @Test
    void grantsAreCopiedSoTheActorCantChangeUnderneathAService() {
        List<RoleGrant> grants = new java.util.ArrayList<>();
        Actor actor = new Actor(UUID.randomUUID(), grants);
        grants.add(new RoleGrant(SCHOOL_A, "School A", null, Role.TEACHER));

        assertThat(actor.holds(Role.TEACHER)).isFalse();
    }
}
