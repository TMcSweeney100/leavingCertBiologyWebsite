package ie.coursework.components.adapter.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** FR-38. https only, checked by the service after stripping (HttpsLink). */
public record DocumentLinkRequest(@NotBlank @Size(max = 2000) String url) {}
