package ie.coursework.shared.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ie.coursework.security.CurrentActorArgumentResolver;
import ie.coursework.shared.web.WebConfig;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pins the response shape the frontend's ApiError parses. Filters are off so this stays a test of
 * the advice alone once Spring Security is on the classpath (Task 6), and the actor argument
 * resolver is excluded because it needs the identity services this slice doesn't load.
 */
@WebMvcTest(
        controllers = ProblemDetailsAdviceTest.TestController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {WebConfig.class, CurrentActorArgumentResolver.class}))
@AutoConfigureMockMvc(addFilters = false)
@Import({ProblemDetailsAdvice.class, ProblemDetailsAdviceTest.TestController.class})
class ProblemDetailsAdviceTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void domainExceptionBecomesProblemDetailsWithACode() throws Exception {
        mockMvc.perform(get("/test/domain"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Not found"))
                .andExpect(jsonPath("$.detail").value("No class with that id."))
                .andExpect(jsonPath("$.instance").value("/test/domain"))
                .andExpect(jsonPath("$.type").value("urn:coursework:problem:not-found"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void beanValidationListsEachField() throws Exception {
        mockMvc.perform(post("/test/validated").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"))
                .andExpect(jsonPath("$.fieldErrors[0].message").isNotEmpty());
    }

    @Test
    void unreadableJsonIsAMalformedRequestNotA500() throws Exception {
        mockMvc.perform(post("/test/validated").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    void unknownPathIsANotFoundProblem() throws Exception {
        mockMvc.perform(get("/test/nothing-here"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void wrongMethodIsMethodNotAllowed() throws Exception {
        mockMvc.perform(post("/test/domain"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void unexpectedExceptionHidesItsMessage() throws Exception {
        String body = mockMvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("jdbc:postgresql://secret");
    }

    record NamedRequest(@NotBlank String name) {}

    @RestController
    static class TestController {
        @GetMapping("/test/domain")
        String domain() {
            throw new DomainException(ErrorCode.NOT_FOUND, "No class with that id.");
        }

        @PostMapping("/test/validated")
        String validated(@Valid @RequestBody NamedRequest request) {
            return request.name();
        }

        @GetMapping("/test/boom")
        String boom() {
            throw new IllegalStateException("could not connect to jdbc:postgresql://secret");
        }
    }
}
