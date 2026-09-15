package ie.coursework;

import ie.coursework.identity.adapter.cli.OperatorCommandRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
public class CourseworkApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = start(args);
        if (OperatorCommandRunner.isOperatorInvocation(args)) {
            System.exit(SpringApplication.exit(context));
        }
    }

    /** Separate from main so a test can start an operator process without System.exit. */
    public static ConfigurableApplicationContext start(String[] args) {
        SpringApplication application = new SpringApplication(CourseworkApplication.class);
        if (OperatorCommandRunner.isOperatorInvocation(args)) {
            application.setWebApplicationType(WebApplicationType.NONE);
        }
        return application.run(args);
    }
}
