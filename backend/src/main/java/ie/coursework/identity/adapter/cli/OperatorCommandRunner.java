package ie.coursework.identity.adapter.cli;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.stereotype.Component;

/** Runs an operator command when the process was started with {@code operator} as its first argument. */
@Component
public class OperatorCommandRunner implements ApplicationRunner, ExitCodeGenerator {

    public static final String KEYWORD = "operator";

    private final OperatorCommands commands;
    private int exitCode = 0;

    public OperatorCommandRunner(OperatorCommands commands) {
        this.commands = commands;
    }

    public static boolean isOperatorInvocation(String[] args) {
        return args.length > 0 && KEYWORD.equals(args[0]);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isOperatorInvocation(args.getSourceArgs())) {
            exitCode = commands.run(args, System.out);
        }
    }

    @Override
    public int getExitCode() {
        return exitCode;
    }
}
