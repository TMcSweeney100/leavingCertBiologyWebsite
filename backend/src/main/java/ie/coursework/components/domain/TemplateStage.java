package ie.coursework.components.domain;

import java.util.UUID;

public record TemplateStage(UUID id, int ordinal, String label, String name, String description, Integer hoursMin,
        Integer hoursMax, String hoursGroup, boolean supervised) {

    /** "Stage 4", or the name of an unnumbered stage ("Compilation of the final report"). */
    public String displayLabel() {
        return label != null ? label : name;
    }
}
