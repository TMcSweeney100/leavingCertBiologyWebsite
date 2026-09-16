package ie.coursework.identity.adapter.web;

import ie.coursework.identity.application.AccountView;
import ie.coursework.identity.domain.Role;
import java.util.List;
import java.util.UUID;

/** The signed-in account, as `GET /auth/me` and `POST /auth/login` return it (roadmap §7). */
public record MeResponse(
        UUID userId, String username, String firstName, String lastName, boolean mustChangePassword, List<RoleView> roles) {

    public record RoleView(UUID schoolId, String schoolName, String schoolShortName, Role role) {}

    static MeResponse from(AccountView account) {
        return new MeResponse(
                account.profile().userId(),
                account.profile().username(),
                account.profile().firstName(),
                account.profile().lastName(),
                account.profile().mustChange(),
                account.grants().stream()
                        .map(grant -> new RoleView(grant.schoolId(), grant.schoolName(), grant.schoolShortName(), grant.role()))
                        .toList());
    }
}
