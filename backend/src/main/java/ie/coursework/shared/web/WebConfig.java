package ie.coursework.shared.web;

import ie.coursework.security.CurrentActorArgumentResolver;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final CurrentActorArgumentResolver currentActor;

    public WebConfig(CurrentActorArgumentResolver currentActor) {
        this.currentActor = currentActor;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentActor);
    }
}
