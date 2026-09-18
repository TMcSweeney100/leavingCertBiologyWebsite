package ie.coursework.components.domain;

import java.time.LocalDate;

/** Design §8.4: a checkpoint is due once its stage's date has passed. Phase 4 adds SIGNED_OFF. */
public enum CheckpointState {
    NOT_DUE,
    DUE;

    public static CheckpointState at(LocalDate stageDate, LocalDate today) {
        return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
    }
}
