package ie.coursework.classes.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EnrolmentStatusTest {

    @Test
    void onlyAPendingRequestCanBeApproved() {
        assertThat(EnrolmentStatus.PENDING.canApprove()).isTrue();
        assertThat(EnrolmentStatus.APPROVED.canApprove()).isFalse();
        assertThat(EnrolmentStatus.REMOVED.canApprove()).isFalse();
    }

    @Test
    void pendingAndApprovedCanBeRemoved() {
        assertThat(EnrolmentStatus.PENDING.canRemove()).isTrue();
        assertThat(EnrolmentStatus.APPROVED.canRemove()).isTrue();
        assertThat(EnrolmentStatus.REMOVED.canRemove()).isFalse();
    }

    @Test
    void onlyARemovedStudentCanAskAgain() {
        assertThat(EnrolmentStatus.REMOVED.canRequestAgain()).isTrue();
        assertThat(EnrolmentStatus.PENDING.canRequestAgain()).isFalse();
        assertThat(EnrolmentStatus.APPROVED.canRequestAgain()).isFalse();
    }
}
