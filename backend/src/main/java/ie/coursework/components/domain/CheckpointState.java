package ie.coursework.components.domain;

import java.time.LocalDate;

/**
 * Design §8.4: a checkpoint is due once its stage's date has passed. A sign-off settles it whenever it was
 * given (plan P4-5). An open request makes it READY: the student is waiting on the teacher, so it is never
 * counted as behind (ready-for-signoff R-9).
 */
public enum CheckpointState {
    NOT_DUE,
    DUE,
    READY,
    SIGNED_OFF;

    public static CheckpointState at(LocalDate stageDate, LocalDate today, boolean signedOff, boolean requested) {
        if (signedOff) {
            return SIGNED_OFF;
        }
        if (requested) {
            return READY;
        }
        return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
    }
}
