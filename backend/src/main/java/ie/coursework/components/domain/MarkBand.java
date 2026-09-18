package ie.coursework.components.domain;

import java.util.List;

public record MarkBand(String label, String name, int marks, boolean wholeReport, List<String> criteria, List<String> sectionLabels) {}
