-- Business Alive Investigative Study template, version 1 (design §4.4, §4.5, §7.2, §7.3).
--
-- Source keys: NCCA-BUS = NCCA guidelines, November 2024, printed page numbers;
--              SEC-2027L033C2EL = final 2027 brief.
-- Every row is checked against those PDFs by SourceTextTest, and read by Tim against the PDFs before merge.

INSERT INTO component_template (subject_id, slug, name, deliverable_type, weighting_percent, marks_total)
SELECT id, 'business-alive-investigative-study', 'Business Alive Investigative Study', 'REPORT', 40, 200
FROM subject WHERE code = 'BUSINESS';

INSERT INTO template_version (template_id, version_no, process_note, process_note_source_ref)
SELECT id, 1,
       'Ongoing monitoring of the process and reflection is a key aspect across the stages of the Investigative Study.',
       'NCCA-BUS p. 4'
FROM component_template WHERE slug = 'business-alive-investigative-study';

CREATE TEMP VIEW business_version AS
SELECT v.id AS version_id
FROM template_version v
JOIN component_template t ON t.id = v.template_id
WHERE t.slug = 'business-alive-investigative-study' AND v.version_no = 1;

-- Stages: names from the brief (p. 5), descriptions and hours from the guidelines. Stages 4 and 5 share one
-- estimate, 6-8 hours (p. 6, p. 7). "Compilation of the final report" has no stage number (P2-2).
INSERT INTO template_stage (version_id, ordinal, label, name, description, hours_min, hours_max, hours_group, source_ref)
SELECT bv.version_id, stage.ordinal, stage.label, stage.name, stage.description,
       stage.hours_min, stage.hours_max, stage.hours_group, 'NCCA-BUS p. ' || stage.page
FROM business_version bv
CROSS JOIN (VALUES
    (1, 'Stage 1', 'Getting Started', 'Having received the brief, students will complete initial background research to inform their understanding and thinking around the theme.', 2, 3, NULL::text, 4),
    (2, 'Stage 2', 'Developing a question to research', 'Having completed their initial background research students will develop a research question.', 1, 2, NULL, 5),
    (3, 'Stage 3', 'Developing a project plan', 'Students should develop a project plan for their study.', 1, 2, NULL, 5),
    (4, 'Stage 4', 'Identifying sources and gathering information and data', 'Students will conduct research to further explore the question they have identified for research.', 6, 8, 'stages-4-5', 6),
    (5, 'Stage 5', 'Analysis and evaluation', 'In stage 5 students will analyse and evaluate the data and information that they have gathered.', 6, 8, 'stages-4-5', 6),
    (6, 'Stage 6', 'Applying learning and drawing conclusions', 'Once students have analysed and evaluated the information and data gathered during the Investigative Study they will be required to apply this learning as part of their conclusion.', 1, 2, NULL, 7),
    (7, NULL, 'Compilation of the final report', 'Students will compile their final report prior to submitting to their teacher for review and authentication before submission to the State Examinations Commission (SEC).', 2, 3, NULL, 8)
) AS stage (ordinal, label, name, description, hours_min, hours_max, hours_group, page);

-- Report structure (brief p. 7): five headings, four with a suggested word count, each with indicative content.
INSERT INTO template_section (version_id, ordinal, label, name, suggested_words, indicative_content, source_ref)
SELECT bv.version_id, section.ordinal, section.ordinal::text, section.name, section.words, section.content,
       'SEC-2027L033C2EL p. 7'
FROM business_version bv
CROSS JOIN (VALUES
    (1, 'Introduction', 200, ARRAY[
        'State your research question',
        'Explain the rationale for choosing this question',
        'Reflect on how you engaged with your project plan']),
    (2, 'Investigation and Findings', 400, ARRAY[
        'Explain the purpose and relevance of the different research methods and sources used appropriate to your research question',
        'Present your research findings in appropriate formats',
        'Consider a variety of perspectives']),
    (3, 'Analysis and Evaluation', 600, ARRAY[
        'Analyse your research findings',
        'Evaluate your research findings',
        'Demonstrate originality and critical thinking throughout your analysis and evaluation']),
    (4, 'Conclusions', 300, ARRAY[
        'Present conclusions justified by the analysis and evaluation',
        'Outline how your planning contributed to the successful completion of the study',
        'Discuss how your perspective evolved as a result of the study',
        'Consider how your findings connect to the real world of business']),
    (5, 'References', NULL::int, ARRAY[
        'Appropriately record the sources of all the information gathered.'])
) AS section (ordinal, name, words, content);

-- Mark allocation (brief p. 8). References has no marks of its own; Overall Coherence covers the whole report.
INSERT INTO template_mark_band (version_id, ordinal, name, marks, whole_report, criteria, source_ref)
SELECT bv.version_id, band.ordinal, band.name, band.marks, band.whole_report, band.criteria, 'SEC-2027L033C2EL p. 8'
FROM business_version bv
CROSS JOIN (VALUES
    (1, 'Introduction', 20, false, ARRAY[]::text[]),
    (2, 'Investigation, Findings, Analysis and Evaluation', 100, false, ARRAY[]::text[]),
    (3, 'Conclusion', 30, false, ARRAY[]::text[]),
    (4, 'Overall Coherence', 50, true, ARRAY[
        'Evidence of planning and reflection should be clear throughout.',
        'Marks are also awarded for logical structure, clarity of expression, originality, effective use of business terminology, and the inclusion of accurate references.'])
) AS band (ordinal, name, marks, whole_report, criteria);

INSERT INTO template_mark_band_section (version_id, band_id, section_id)
SELECT bv.version_id, b.id, s.id
FROM business_version bv
JOIN template_mark_band b ON b.version_id = bv.version_id
JOIN template_section s ON s.version_id = bv.version_id
JOIN (VALUES (1, 1), (2, 2), (2, 3), (3, 4)) AS covers (band, section)
  ON covers.band = b.ordinal AND covers.section = s.ordinal;

-- Checkpoints (design §7.3). Stage 6 has none: the guidelines state nothing for it.
INSERT INTO template_checkpoint (version_id, stage_id, ordinal, text, basis, source_quote, source_ref)
SELECT bv.version_id, stage.id, 1, point.text, point.basis, point.quote, 'NCCA-BUS p. ' || point.page
FROM business_version bv
JOIN (VALUES
    (1, 'Initial ideas discussed with the teacher', 'DESCRIBED', 'Teacher interaction with students at this stage provides an opportunity to familiarise themselves with the students’ initial ideas and to identify any gaps in understanding.', 5),
    (2, 'Research question discussed with the teacher', 'EXPLICIT', 'Students should discuss their proposed question to research with their teacher and the teacher may encourage students to use the student prompt questions to help the student to refine their question.', 5),
    (3, 'Project plan shared with the teacher', 'EXPLICIT', 'Sharing the plan with the teacher is an important step in the ongoing authentication process.', 6),
    (4, 'Research shared when the teacher asks', 'EXPLICIT', 'The teacher can ask for work to be shared by students at regular intervals as part of the ongoing process of authentication of student work.', 6),
    (5, 'Analysis and evaluation shared with the teacher', 'EXPLICIT', 'Sharing this work with the teacher is an important step in the ongoing authentication process.', 7),
    (7, 'Final report submitted for review and authentication', 'EXPLICIT', 'Students will compile their final report prior to submitting to their teacher for review and authentication before submission to the State Examinations Commission (SEC).', 8)
) AS point (stage_ordinal, text, basis, quote, page) ON true
JOIN template_stage stage ON stage.version_id = bv.version_id AND stage.ordinal = point.stage_ordinal;

-- Prompts. The guidelines mark each list "a set of sample prompts which may be used and is not exhaustive".
-- Stage 1 (p. 4, running onto p. 5); Stage 2 from Appendix One (p. 16); Stage 3 from Appendix Two (p. 18);
-- Stage 5 analysis and evaluation (p. 7); Stage 6 (p. 8).
INSERT INTO template_prompt (version_id, stage_id, ordinal, heading, text, source_ref)
SELECT bv.version_id, stage.id, prompt.ordinal, prompt.heading, prompt.text, 'NCCA-BUS p. ' || prompt.page
FROM business_version bv
JOIN (VALUES
    (1, 1, 'Students may find it useful to consider the following prompts', 'What do I already know about the theme within the brief?', 4),
    (1, 2, 'Students may find it useful to consider the following prompts', 'What else do I need to know/ would I like to know about this theme?', 4),
    (1, 3, 'Students may find it useful to consider the following prompts', 'Does this theme link to what I may have learned to date in my Leaving Certificate Business class, to business in the world around me or to other aspects of learning inside or outside school? How?', 4),
    (1, 4, 'Students may find it useful to consider the following prompts', 'How might I learn more about this theme? What resources or sources might be useful for me?', 4),
    (1, 5, 'Students may find it useful to consider the following prompts', 'Where will I store my background research? How might I do this?', 4),

    (2, 1, 'Specific', 'Is my question linked to the theme in the brief? Why and how is it linked? (Your background research might be useful here)', 16),
    (2, 2, 'Specific', 'Is my question clear and focused? Does the question state exactly what I want to answer? Is there anything I could change to make it clearer?', 16),
    (2, 3, 'Measurable', 'Can I find enough information to respond to my question from a range of different sources? Should I use primary and/or secondary sources?', 16),
    (2, 4, 'Measurable', 'Will I be able to access the information I need? If not, should I rethink my question?', 16),
    (2, 5, 'Achievable', 'Where will I find the information I need? What sources might I use and how will I access these sources? Are there sufficient sources of information or data available?', 16),
    (2, 6, 'Relevant', 'Is my question helping me to develop my understanding of the theme within the brief? Is it linked to what I am learning in my Business class or to business in the world around me?', 16),
    (2, 7, 'Timebound', 'Having considered the prompts set out in this table can I use my research question to make a project plan for my investigation?', 16),
    (2, 8, 'Timebound', 'Will I be able to carry out the plan in the time allocated? If not, do I need to reconsider or narrow my question?', 16),

    (3, 1, 'Objectives', 'What is the purpose of my research? What am I aiming to find out?', 18),
    (3, 2, 'Objectives', 'How is this linked to my research question? How is this relevant for business either locally, nationally or internationally? Why is it of interest to me?', 18),
    (3, 3, 'Objectives', 'What are my goals for each stage of my work?', 18),
    (3, 4, 'My role', 'What have I learned previously that might help me?', 18),
    (3, 5, 'My role', 'What will I need to do? What skills will I need in doing this study?', 18),
    (3, 6, 'My role', 'What competencies might I develop in doing this study?', 18),
    (3, 7, 'My role', 'How will I organise my work and keep records? How will I monitor and evaluate my progress?', 18),
    (3, 8, 'Resources', 'What resources will I need to access to answer my research question?', 18),
    (3, 9, 'Resources', 'When will I need access? How will I access these resources?', 18),
    (3, 10, 'Resources', 'Are these resources suitable for the question I have developed? Will they give me a range of perspectives?', 18),
    (3, 11, 'Time schedule', 'What is the time frame for my study? What are the main stages involved in the study? What will I need to do and when?', 18),
    (3, 12, 'Time schedule', 'Have I prepared a plan to make best use of my time?', 18),
    (3, 13, 'Time schedule', 'Have I allowed enough time to complete each stage of the work? How and when will I track my progress?', 18),
    (3, 14, 'Possible risks', 'Have I considered what might go wrong or challenges I might encounter?', 18),
    (3, 15, 'Possible risks', 'How might these risks impact on the progress or completion of my study? How might I overcome these?', 18),
    (3, 16, 'Possible risks', 'How will I identify what is working well?', 18),
    (3, 17, 'Ongoing monitoring and evaluation', 'What is working well? How do I know?', 18),
    (3, 18, 'Ongoing monitoring and evaluation', 'What could be better? How do I know/ What might I do to improve?', 18),
    (3, 19, 'Ongoing monitoring and evaluation', 'How am I progressing in line with my goals and timelines?', 18),
    (3, 20, 'Ongoing monitoring and evaluation', 'Do I need to reconsider my question? Do I need to access additional sources of information?', 18),
    (3, 21, 'Ongoing monitoring and evaluation', 'What are the limitations of my investigative study?', 18),

    (5, 1, 'Students may analyse the information and data they have gathered to identify key findings through', 'breaking down the information and/ or data into smaller parts', 7),
    (5, 2, 'Students may analyse the information and data they have gathered to identify key findings through', 'identifying patterns/ trends/ contradictions in the information and/or data', 7),
    (5, 3, 'Students may analyse the information and data they have gathered to identify key findings through', 'highlighting the most important aspects of the information/data relative to the research question', 7),
    (5, 4, 'In evaluating their findings students may find it useful to consider the following prompts', 'how is the information or data relevant to my research question?', 7),
    (5, 5, 'In evaluating their findings students may find it useful to consider the following prompts', 'is this a reliable source of information? How do I know? How recent is this information or data? Is it up to date?', 7),
    (5, 6, 'In evaluating their findings students may find it useful to consider the following prompts', 'is the information biased or unbiased? Why do I think this? How do I know? What is the purpose of the information or data? Is it based on fact or opinion?', 7),
    (5, 7, 'In evaluating their findings students may find it useful to consider the following prompts', 'are there any alternative explanations or perspectives?', 7),
    (5, 8, 'In evaluating their findings students may find it useful to consider the following prompts', 'what is the information I have gathered telling me? How do I know?', 7),
    (5, 9, 'In evaluating their findings students may find it useful to consider the following prompts', 'are there limitations to the findings? What are they?', 7),

    (6, 1, 'Students may find it useful to consider the following', 'how do my findings respond to my research question and the objectives I set at the outset of my study?', 8),
    (6, 2, 'Students may find it useful to consider the following', 'how do these findings relate to my learning across the Business specification and my learning in the Business classroom?', 8),
    (6, 3, 'Students may find it useful to consider the following', 'how can I apply these findings to the world of business (locally, nationally and/or internationally)? How do they link to the world of business or business-related stories or information in the media?', 8),
    (6, 4, 'Students may find it useful to consider the following', 'how do these findings link to the cross-cutting theme(s) in the specification?', 8),
    (6, 5, 'Students may find it useful to consider the following', 'how have the findings of my Investigative Study influenced my perspective(s)?', 8)
) AS prompt (stage_ordinal, ordinal, heading, text, page) ON true
JOIN template_stage stage ON stage.version_id = bv.version_id AND stage.ordinal = prompt.stage_ordinal;

UPDATE template_version v SET status = 'PUBLISHED', published_at = now()
FROM business_version bv WHERE v.id = bv.version_id;

DROP VIEW business_version;
