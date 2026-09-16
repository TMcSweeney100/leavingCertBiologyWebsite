package ie.coursework.identity.domain;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Who is making this request, and what they hold. Every service method takes one (design §9), so a
 * scope check is never more than one argument away. Resolved fresh on every request (roadmap R10).
 */
public record Actor(UUID userId, List<RoleGrant> grants) {

    public Actor {
        grants = List.copyOf(grants);
    }

    public boolean holds(Role role) {
        return grants.stream().anyMatch(grant -> grant.role() == role);
    }

    public boolean holds(Role role, UUID schoolId) {
        return grants.stream().anyMatch(grant -> grant.role() == role && grant.schoolId().equals(schoolId));
    }

    public Set<UUID> schoolsWhere(Role role) {
        return grants.stream()
                .filter(grant -> grant.role() == role)
                .map(RoleGrant::schoolId)
                .collect(Collectors.toUnmodifiableSet());
    }
}
