package ie.coursework.components.application;

import ie.coursework.components.application.ComponentViews.AnswerView;
import ie.coursework.components.application.ComponentViews.OpenRequestView;
import ie.coursework.components.domain.DublinDate;
import ie.coursework.components.domain.SignoffRequest;
import java.util.List;

/** One checkpoint's request rows (newest first, as SignoffRequestRepository.forStudent returns them) as views. */
public final class RequestViews {

    private RequestViews() {}

    public static OpenRequestView open(List<SignoffRequest> rows) {
        return rows.stream().filter(SignoffRequest::open).findFirst()
                .map(r -> new OpenRequestView(DublinDate.of(r.askedAt()), r.studentNote())).orElse(null);
    }

    public static List<AnswerView> answers(List<SignoffRequest> rows) {
        return rows.stream().filter(r -> !r.open())
                .map(r -> new AnswerView(DublinDate.of(r.askedAt()), r.studentNote(), r.outcome(), DublinDate.of(r.answeredAt()),
                        r.teacherNote()))
                .toList();
    }
}
