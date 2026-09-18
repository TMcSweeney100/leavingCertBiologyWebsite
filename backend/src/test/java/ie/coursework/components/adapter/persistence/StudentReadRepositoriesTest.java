package ie.coursework.components.adapter.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import ie.coursework.PostgresIntegrationTest;
import ie.coursework.components.domain.Brief;
import ie.coursework.components.domain.MarkBand;
import ie.coursework.components.domain.TemplateSection;
import ie.coursework.support.ClassFixtures;
import ie.coursework.support.ComponentFixtures;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class StudentReadRepositoriesTest extends PostgresIntegrationTest {

    @Autowired private ClassFixtures fixtures;
    @Autowired private ComponentFixtures components;
    @Autowired private BriefRepository briefs;
    @Autowired private TemplateRepository templates;
    @Autowired private ComponentRepository componentRepository;

    @Test
    void readsBusinessSectionsBandsPromptsAndRules() {
        Brief business = briefs.published("BUSINESS", 2027).getFirst();

        assertThat(templates.sections(business.versionId())).extracting(TemplateSection::name, TemplateSection::suggestedWords)
                .startsWith(org.assertj.core.groups.Tuple.tuple("Introduction", 200));
        assertThat(templates.bands(business.versionId())).extracting(MarkBand::name, MarkBand::sectionLabels)
                .contains(org.assertj.core.groups.Tuple.tuple("Investigation, Findings, Analysis and Evaluation", java.util.List.of("2", "3")));
        assertThat(templates.prompts(business.versionId())).hasSize(48);
        assertThat(templates.checkpoints(business.versionId())).hasSize(6);
        assertThat(templates.processNote(business.versionId())).contains("reflection");
        assertThat(briefs.details(business.id()).imageLimit()).isEqualTo(10);
        assertThat(briefs.rules(business.id())).hasSize(7).first().extracting("key").isEqualTo("Section headings");
    }

    @Test
    void aComponentIsVisibleOnlyToApprovedStudentsOfItsClass() {
        ClassFixtures.World world = fixtures.world();
        UUID component = components.component(world.class1(), world.teacher1(), ComponentFixtures.BIOLOGY_2027);

        assertThat(componentRepository.findForApprovedStudent(component, world.approvedStudent())).isPresent();
        assertThat(componentRepository.findForApprovedStudent(component, world.pendingStudent())).isEmpty();
        assertThat(componentRepository.findForApprovedStudent(component, world.removedStudent())).isEmpty();
        assertThat(componentRepository.findForApprovedStudent(component, world.outsider())).isEmpty();
        assertThat(componentRepository.forStudent(world.approvedStudent())).extracting("componentId").containsExactly(component);
        assertThat(componentRepository.forStudent(world.pendingStudent())).isEmpty();
    }
}
