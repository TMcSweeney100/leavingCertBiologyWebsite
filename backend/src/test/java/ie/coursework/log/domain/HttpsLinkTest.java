package ie.coursework.log.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HttpsLinkTest {

    @Test
    void acceptsAbsoluteHttpsWithAHost() {
        assertThat(HttpsLink.valid("https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/")).isTrue();
        assertThat(HttpsLink.valid("https://chat.openai.com/share/f45a1e23-2217-4443-a244-d56ab26ae940")).isTrue();
    }

    @Test
    void refusesEverythingElse() {
        assertThat(HttpsLink.valid("http://youtu.be/yCv4iyPqZKQ")).isFalse();
        assertThat(HttpsLink.valid("javascript:alert(1)")).isFalse();
        assertThat(HttpsLink.valid("https://")).isFalse();
        assertThat(HttpsLink.valid("thelatinlibrary.com/101/RhetoricalDevices")).isFalse();
        assertThat(HttpsLink.valid("https://exa mple.com")).isFalse();
        assertThat(HttpsLink.valid(null)).isFalse();
    }
}
