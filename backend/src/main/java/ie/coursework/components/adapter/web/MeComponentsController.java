package ie.coursework.components.adapter.web;

import ie.coursework.components.application.ComponentService;
import ie.coursework.components.application.ComponentViews.MyComponent;
import ie.coursework.identity.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeComponentsController {

    private final ComponentService components;

    public MeComponentsController(ComponentService components) {
        this.components = components;
    }

    /** Components of the signed-in user's approved classes. Empty for anyone who is nobody's student. */
    @GetMapping("/api/v1/me/components")
    List<MyComponent> myComponents(Actor actor) {
        return components.myComponents(actor);
    }
}
