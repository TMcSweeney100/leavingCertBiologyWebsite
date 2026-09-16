package ie.coursework.identity.adapter.cli;

import ie.coursework.identity.application.CreatedAccount;
import ie.coursework.identity.application.OperatorService;
import ie.coursework.identity.domain.Role;
import ie.coursework.shared.error.DomainException;
import java.io.PrintStream;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Component;

/** Parses {@code operator <command> --option=value …} and calls OperatorService. */
@Component
public class OperatorCommands {

    static final int OK = 0;
    static final int FAILED = 1;
    static final int USAGE = 2;

    private static final String USAGE_TEXT = """
            usage:
              operator create-school --name=<name> --roll=<roll number> [--short-name=<name for the app header>]
              operator set-school-short-name --roll=<roll number> --short-name=<name for the app header>
              operator create-user   --first-name=<name> --last-name=<name> --username=<username>
              operator grant-role    --username=<username> --roll=<roll number> --role=STUDENT|TEACHER|SCHOOL_LEADER
            """;

    private final OperatorService operator;

    public OperatorCommands(OperatorService operator) {
        this.operator = operator;
    }

    public int run(ApplicationArguments args, PrintStream out) {
        List<String> words = args.getNonOptionArgs();
        String command = words.size() > 1 ? words.get(1) : "";
        try {
            return switch (command) {
                case "create-school" -> createSchool(args, out);
                case "set-school-short-name" -> setSchoolShortName(args, out);
                case "create-user" -> createUser(args, out);
                case "grant-role" -> grantRole(args, out);
                default -> usage(out);
            };
        } catch (MissingOption e) {
            out.println("missing --" + e.getMessage());
            return usage(out);
        } catch (DomainException e) {
            out.println("error: " + e.getMessage());
            return FAILED;
        }
    }

    private int createSchool(ApplicationArguments args, PrintStream out) {
        String name = required(args, "name");
        String roll = required(args, "roll");
        String shortName = optional(args, "short-name");
        out.println("Created school " + name + " (" + roll + ") id=" + operator.createSchool(name, shortName, roll));
        return OK;
    }

    private int setSchoolShortName(ApplicationArguments args, PrintStream out) {
        String roll = required(args, "roll");
        String shortName = required(args, "short-name");
        operator.setSchoolShortName(roll, shortName);
        out.println("Short name of " + roll + " is now " + shortName);
        return OK;
    }

    private int createUser(ApplicationArguments args, PrintStream out) {
        CreatedAccount account = operator.createUser(
                required(args, "first-name"), required(args, "last-name"), required(args, "username"));
        out.println("Created " + account.username() + ".");
        out.println("Temporary password (shown once): " + account.temporaryPassword());
        return OK;
    }

    private int grantRole(ApplicationArguments args, PrintStream out) {
        String username = required(args, "username");
        String roll = required(args, "roll");
        Role role;
        try {
            role = Role.valueOf(required(args, "role"));
        } catch (IllegalArgumentException e) {
            return usage(out);
        }
        boolean granted = operator.grantRole(username, roll, role);
        out.println((granted ? "Granted " : "Already held: ") + role + " at " + roll + " for " + username);
        return OK;
    }

    private int usage(PrintStream out) {
        out.print(USAGE_TEXT);
        return USAGE;
    }

    private static String optional(ApplicationArguments args, String name) {
        List<String> values = args.getOptionValues(name);
        return values == null || values.isEmpty() || values.getFirst().isBlank() ? null : values.getFirst();
    }

    private static String required(ApplicationArguments args, String name) {
        List<String> values = args.getOptionValues(name);
        if (values == null || values.isEmpty() || values.getFirst().isBlank()) {
            throw new MissingOption(name);
        }
        return values.getFirst();
    }

    private static final class MissingOption extends RuntimeException {
        MissingOption(String name) {
            super(name);
        }
    }
}
