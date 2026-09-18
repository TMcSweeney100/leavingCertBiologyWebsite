package ie.coursework.components.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Design §6.4: stages needn't be dated in order, because students move back and forth between them, but a
 * later stage due before the one before it is probably a slip, so it's a warning, never a refusal.
 */
public final class StageOrder {

    private StageOrder() {}

    /** Pairs [earlier stage, later stage] where the later stage is due before the dated stage before it. */
    public static List<List<UUID>> outOfOrder(List<DatedStage> stages) {
        List<DatedStage> dated = stages.stream()
                .filter(s -> s.dueDate() != null)
                .sorted(Comparator.comparingInt(DatedStage::ordinal))
                .toList();
        List<List<UUID>> pairs = new ArrayList<>();
        for (int i = 1; i < dated.size(); i++) {
            if (dated.get(i).dueDate().isBefore(dated.get(i - 1).dueDate())) {
                pairs.add(List.of(dated.get(i - 1).stageId(), dated.get(i).stageId()));
            }
        }
        return pairs;
    }
}
