package ie.coursework.security;

import ie.coursework.identity.application.ActorResolver;
import ie.coursework.identity.domain.Actor;
import ie.coursework.shared.error.DomainException;
import ie.coursework.shared.error.ErrorCode;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** Supplies an {@link Actor} to any controller method that declares one. */
@Component
public class CurrentActorArgumentResolver implements HandlerMethodArgumentResolver {

    private final ActorResolver actors;

    public CurrentActorArgumentResolver(ActorResolver actors) {
        this.actors = actors;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return Actor.class.equals(parameter.getParameterType());
    }

    @Override
    public Actor resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return actors.resolve(user.userId());
        }
        throw new DomainException(ErrorCode.UNAUTHENTICATED, "Sign in to continue.");
    }
}
