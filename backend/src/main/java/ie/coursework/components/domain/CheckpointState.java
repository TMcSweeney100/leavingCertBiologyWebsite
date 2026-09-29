package ie.coursework.components.domain;

import java.time.LocalDate;

/**
 * Design §8.4: a checkpoint is due once its stage's date has passed. A sign-off settles it whenever it was
 * given, so a student signed off early is never counted as behind (plan P4-5).
 */
public enum CheckpointState {
    NOT_DUE,
    DUE,
    SIGNED_OFF;

    public static CheckpointState at(LocalDate stageDate, LocalDate today, boolean signedOff) {
        if (signedOff) {
            return SIGNED_OFF;
        }
        return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
    }
}
