-- The four final 2027 SEC briefs (design §4.1, §4.3, §4.4, §7.4). Never the EN-EX sample briefs: their
-- dates are placeholders.
--
-- Source keys: SEC-2027L025C2EL Biology, SEC-2027L022C2EL Chemistry, SEC-2027L021C2EL Physics,
-- SEC-2027L033C2EL Business. Completion date p. 2, formatting rules p. 3, topic p. 6, limits p. 5 (Business)
-- or p. 7 (sciences). Checked against the PDFs by SourceTextTest and BriefContentTest.

INSERT INTO annual_brief (template_id, template_version_id, exam_year, sec_code, title, topic_title, topic_body,
                          completion_date, word_limit, words_not_counted, image_limit, image_note, source_ref)
SELECT t.id, v.id, 2027, brief.sec_code, t.name, brief.topic_title, brief.topic_body,
       brief.completion_date, 1500, brief.words_not_counted, brief.image_limit, brief.image_note,
       'SEC-' || brief.sec_code || ' p. 2'
FROM (VALUES
    ('biology-in-practice-investigation', '2027L025C2EL', DATE '2027-02-26',
     'Membranes, Osmosis, Food Preservation',
     E'Cells have a selectively permeable plasma membrane which can control the movement of substances into and out of the cell. One important substance that moves into and out of cells is water.\n\n'
     'Foods that have a high water content support microbial growth. This can lead to spoilage and decay. One method of food preservation involves the loss of water from microbial cells by osmosis. Preserving food by osmosis relies on placing food in solutions of high solute concentration, such as sugar syrups or salt brines.\n\n'
     'There are many factors (temperature, concentration gradient, surface area, etc.) that affect the rate of osmosis. Knowledge and understanding of these factors and how they affect osmosis can help scientists extend food shelf life and improve food safety.\n\n'
     'Investigate one or more aspects of this topic using the process described in Section 4 of this document.',
     'This word count does not include words used in references, in data tables, in formulae or equations, or as labels.',
     20,
     'To ensure fairness across the different methods, formulae and equations, whether produced using software or handwritten and photographed, will not be counted toward the image limit.'),

    ('chemistry-in-practice-investigation', '2027L022C2EL', DATE '2027-04-23',
     NULL,
     E'Chemical reactions can be classified in a number of ways, including: acid-base, decomposition, redox, combination, displacement, precipitation, etc. These reactions can happen at different speeds; some are instantaneous while others take place over longer periods of time.\n\n'
     'The ability to control the rate of these reactions has wide-ranging impacts across the areas of health, sustainability and technology, from the production and interactions of pharmaceuticals to the rate of electrochemical reactions in battery technology.\n\n'
     'There are a number of factors that are used to control the rate of chemical reactions, including: concentration, surface area, temperature, pressure, the presence of a catalyst, etc. The effects of these factors can be measured directly or indirectly using a variety of methods depending on the chemical and physical changes that take place.\n\n'
     'Investigate one or more aspects of this topic using the process described in Section 4 of this document.',
     'This word count does not include words used in references, in data tables, in formulae or equations, or as labels.',
     20,
     'To ensure fairness across the different methods, formulae and equations, whether produced using software or handwritten and photographed, will not be counted toward the image limit.'),

    ('physics-in-practice-investigation', '2027L021C2EL', DATE '2026-12-11',
     NULL,
     E'Sustainable practices in a domestic setting have led to ways of reducing domestic energy losses, allowing for a comfortable indoor environment with less energy input.\n\n'
     'Investigate one or more aspects of domestic sustainability – energy sources, energy usage and/or energy losses using the process described in Section 4 of this document.',
     'This word count does not include words used in references, in data tables, in formulae or equations, or as labels.',
     20,
     'To ensure fairness across the different methods, formulae and equations, whether produced using software or handwritten and photographed, will not be counted toward the image limit.'),

    ('business-alive-investigative-study', '2027L033C2EL', DATE '2027-03-12',
     NULL,
     E'‘Digitalisation is a major driver of productivity growth through the improvement of process efficiency and the quality of products and services. The growing adoption of technologies is disrupting traditional roles and transforming the world of work.’\n'
     'Department of Enterprise, Tourism and Employment\n'
     'Adapted from www.gov.ie\n\n'
     'You are required to investigate how a work practice that uses digital technology is impacting either employers or employees.\n\n'
     'Support your investigation with appropriate primary and/or secondary data.',
     'This word count does not include words used in references, in data tables, graphs, diagrams, images, or as labels.',
     10,
     'When referring to any specific image in the body of the report, the image must be properly labelled (figure 1, figure 2, etc.).')
) AS brief (slug, sec_code, completion_date, topic_title, topic_body, words_not_counted, image_limit, image_note)
JOIN component_template t ON t.slug = brief.slug
JOIN template_version v ON v.template_id = t.id AND v.version_no = 1;

-- The formatting-rules table (each brief, p. 3), row by row. The margins row's cells are joined with full
-- stops. "Images, tables, graphs: Refer to Section 4" is left out: the limits above are that section.
INSERT INTO brief_rule (brief_id, ordinal, key, value, source_ref)
SELECT b.id, rule.ordinal, rule.key,
       CASE WHEN rule.ordinal = 1 THEN
            CASE WHEN b.sec_code = '2027L033C2EL' THEN 'Each section should be clearly identified and begin on a new page of the report.'
                 ELSE 'Each section should be numbered and begin on a new page of the report.' END
            || ' The heading should use the following font: Arial, black, font size 14 and bold.'
       ELSE rule.value END,
       'SEC-' || b.sec_code || ' p. 3'
FROM annual_brief b
CROSS JOIN (VALUES
    (1, 'Section headings', NULL::text),
    (2, 'Main body text', 'Arial, black, font size 12 with 1.5 line spacing.'),
    (3, 'Text editing features permitted', 'Bold, italics, numbering, and bullets.'),
    (4, 'Text editing features not permitted', 'Coloured text (black text only), highlighted text, different fonts (Arial only).'),
    (5, 'Page orientation', 'Portrait only.'),
    (6, 'Page numbering', 'Bottom-centre of each page.'),
    (7, 'Page margins', 'No work should appear in the margins as it may not be visible to an examiner. Left margin 20 mm. Right margin 20 mm. Top margin 20 mm. Bottom margin 20 mm.')
) AS rule (ordinal, key, value)
WHERE b.exam_year = 2027;

UPDATE annual_brief SET status = 'PUBLISHED', published_at = now() WHERE exam_year = 2027;
