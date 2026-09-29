package ie.coursework.components.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ie.coursework.classes.adapter.persistence.ClassGroupRepository;
import ie.coursework.classes.adapter.persistence.SubjectRepository;
import ie.coursework.classes.application.ClassService;
import ie.coursework.components.adapter.persistence.BriefRepository;
import ie.coursework.components.adapter.persistence.ComponentRepository;
import ie.coursework.components.adapter.persistence.ItemTickRepository;
import ie.coursework.components.adapter.persistence.TeacherItemRepository;
import ie.coursework.components.adapter.persistence.SignoffRepository;
import ie.coursework.components.adapter.persistence.TemplateRepository;
import ie.coursework.components.domain.ComponentInstance;
import ie.coursework.identity.domain.Actor;
import ie.coursework.identity.domain.Role;
import ie.coursework.identity.domain.RoleGrant;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Found reviewing 2D Task 7: owned() checks the component's own owner filter and ClassService.owned
 * independently. Real data can't fail only one (both filter by the class owner), so each is stubbed
 * to fail alone. Bite-test each case by deleting its check in owned().
 */
class ComponentServiceOwnedTest {

    private final ClassService classes = mock(ClassService.class);
    private final ComponentRepository components = mock(ComponentRepository.class);
    private final ComponentService service = new ComponentService(classes, mock(ClassGroupRepository.class),
            mock(SubjectRepository.class), mock(BriefRepository.class), mock(TemplateRepository.class), components,
            mock(TeacherItemRepository.class), mock(ItemTickRepository.class), mock(SignoffRepository.class), Clock.systemUTC());

    private final UUID teacher = UUID.randomUUID();
    private final Actor actor = new Actor(teacher, List.of(new RoleGrant(UUID.randomUUID(), "School A", "SA", Role.TEACHER)));
    private final ComponentInstance component = new ComponentInstance(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

    @Test
    void theClassCheckAloneRefuses() {
        when(components.findOwned(component.id(), teacher)).thenReturn(Optional.of(component));
        when(classes.owned(any(), any())).thenThrow(new DomainException(ErrorCode.NOT_FOUND, "No such class."));
        assertThatThrownBy(() -> service.owned(actor, component.id()))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode()).isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void theComponentOwnerFilterAloneRefuses() {
        when(components.findOwned(component.id(), teacher)).thenReturn(Optional.empty());
        when(classes.owned(any(), any())).thenReturn(null); // would pass
        assertThatThrownBy(() -> service.owned(actor, component.id()))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).errorCode()).isEqualTo(ErrorCode.NOT_FOUND);
    }
}
