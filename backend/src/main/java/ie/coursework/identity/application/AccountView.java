package ie.coursework.identity.application;

import ie.coursework.identity.domain.RoleGrant;
import ie.coursework.identity.domain.UserProfile;
import java.util.List;

public record AccountView(UserProfile profile, List<RoleGrant> grants) {}
