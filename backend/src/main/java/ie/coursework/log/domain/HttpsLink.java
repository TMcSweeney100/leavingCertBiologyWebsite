package ie.coursework.log.domain;

import java.net.URI;
import java.net.URISyntaxException;

/** Design §9: links are https only. Stored and shown, never fetched by the server. */
public final class HttpsLink {

    private HttpsLink() {}

    public static boolean valid(String value) {
        if (value == null) {
            return false;
        }
        try {
            URI uri = new URI(value.strip());
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && !uri.getHost().isBlank();
        } catch (URISyntaxException e) {
            return false;
        }
    }
}
