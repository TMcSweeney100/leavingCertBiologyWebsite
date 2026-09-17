-- Biology, Chemistry and Physics templates, version 1 (design §4.2, §7.2, §7.3).
--
-- One content source for three subjects. What the documents share (stage order, hours, supervision,
-- report sections, mark bands, checkpoint wording) is written once. What they phrase differently is
-- listed per subject, word for word from that subject's own document: the three NCCA guidelines differ
-- in punctuation and in some sentences (Chemistry and Physics say "school laboratory").
--
-- Source keys (resolved to files by SourceDocuments in the tests):
--   NCCA-BIO, NCCA-CHEM, NCCA-PHYS   NCCA guidelines, November 2024, printed page numbers
--   SEC-2027L025C2EL (Biology), SEC-2027L022C2EL (Chemistry), SEC-2027L021C2EL (Physics)   final 2027 briefs
--
-- Every row is checked against those PDFs by SourceTextTest, and read by Tim against the PDFs before merge.

CREATE TEMP TABLE science (
    subject_code text PRIMARY KEY,
    slug         text NOT NULL,
    name         text NOT NULL,
    subject_word text NOT NULL,   -- as the guidelines write it mid-sentence: "activities in biology"
    ncca         text NOT NULL,
    sec          text NOT NULL
);

INSERT INTO science VALUES
    ('BIOLOGY',   'biology-in-practice-investigation',   'Biology in Practice Investigation',   'biology',   'NCCA-BIO',  'SEC-2027L025C2EL'),
    ('CHEMISTRY', 'chemistry-in-practice-investigation', 'Chemistry in Practice Investigation', 'chemistry', 'NCCA-CHEM', 'SEC-2027L022C2EL'),
    ('PHYSICS',   'physics-in-practice-investigation',   'Physics in Practice Investigation',   'physics',   'NCCA-PHYS', 'SEC-2027L021C2EL');

-- 200 marks, 40% of the subject (each brief, p. 2).
INSERT INTO component_template (subject_id, slug, name, deliverable_type, weighting_percent, marks_total)
SELECT subject.id, science.slug, science.name, 'REPORT', 40, 200
FROM science JOIN subject ON subject.code = science.subject_code;

-- Process note: the stages aren't linear (each guideline, p. 5). Two sentences, as each document words them.
INSERT INTO template_version (template_id, version_no, process_note, process_note_source_ref)
SELECT t.id, 1, note.text, science.ncca || ' p. 5'
FROM (VALUES
    ('BIOLOGY',   'Nor is it intended to present the stages as a rigid or linear process. Mistakes, errors and improvements are expected components of the investigative process and students should be prepared to iterate; that is move backwards and forwards between the stages and revisit investigative activities at different times, reflecting on and refining their work as they complete the investigation.'),
    ('CHEMISTRY', 'Nor is it intended that the stages are a rigid or linear process. Mistakes, errors and improvements are expected components of the investigative process and students should be prepared to iterate, that is move backwards and forwards between the stages and revisit investigative activities at different times, reflecting on and refining their work as they complete the investigation.'),
    ('PHYSICS',   'Nor is it intended to present the stages as a rigid and linear process. Mistakes, errors and improvements are expected components of the investigative process and students should be prepared to iterate; that is move backwards and forwards between the stages and revisit investigative activities at different times, reflecting on and refining their work as they complete the investigation.')
) AS note (subject_code, text)
JOIN science USING (subject_code)
JOIN component_template t ON t.slug = science.slug;

CREATE TEMP VIEW science_version AS
SELECT science.*, v.id AS version_id
FROM science
JOIN component_template t ON t.slug = science.slug
JOIN template_version v ON v.template_id = t.id AND v.version_no = 1;

-- Stages. Names from each 2027 brief (p. 5); hours and descriptions from the guidelines. Hours are the
-- same in all three (design §7.2): 1-2, 2-3, 2-3, 1-2, 1-2, up to 4. Stage 4 is supervised: "must be fully
-- completed under the direct supervision of your … teacher" (each brief, p. 5).
INSERT INTO template_stage (version_id, ordinal, label, name, description, hours_min, hours_max, supervised, source_ref)
SELECT sv.version_id, shape.ordinal, 'Stage ' || shape.ordinal, words.name, words.description,
       shape.hours_min, shape.hours_max, shape.supervised, sv.ncca || ' p. ' || words.page
FROM (VALUES
    (1, 1,           2, false),
    (2, 2,           3, false),
    (3, 2,           3, false),
    (4, 1,           2, true),
    (5, 1,           2, false),
    (6, NULL::int,   4, false)
) AS shape (ordinal, hours_min, hours_max, supervised)
JOIN (VALUES
    ('BIOLOGY',   1, 'Initial Response to the Investigation Brief', 'This part of the investigation involves students engaging with an Investigation Brief which provides information about a context involving some biological phenomenon related to the learning in the specification.', 5),
    ('BIOLOGY',   2, 'Background Research', 'During this stage of the process, students develop a research question on a particular issue in response to the Investigation Brief and informed by their background research into the topic.', 7),
    ('BIOLOGY',   3, 'Designing and Planning the Experiment', 'Whatever approach students decide, this stage will involve students using insights from their background research to pose a testable hypothesis and develop experimental strategies for investigating it.', 7),
    ('BIOLOGY',   4, 'Conducting the Experiment', 'During this stage, under the supervision of the teacher in a relevant setting (school laboratory and/or field setting as appropriate to the investigation), each student carries out the experiment they designed.', 8),
    ('BIOLOGY',   5, 'Data Analysis and Conclusions', 'Once the experiment is complete, students are ready to critically analyse their data and draw justifiable conclusions.', 9),
    ('BIOLOGY',   6, 'Finalising the Biology in Practice Investigation Report', 'During this final stage, which, is envisaged should take up to 4 hours to complete, students draw upon their investigative log, which outlines all the stages of their investigation, to compile their final report.', 9),

    ('CHEMISTRY', 1, 'Initial Response to the Investigation Brief', 'This part of the investigation involves students engaging with an Investigation Brief which provides information about a context involving some chemical phenomenon related to the learning in the specification.', 5),
    ('CHEMISTRY', 2, 'Background Research', 'During this stage of the process, students develop a research question on a particular issue in response to the Investigation Brief and informed by their background research into the topic.', 7),
    ('CHEMISTRY', 3, 'Designing and Planning the Experiment', 'Whatever approach students decide, this stage will involve students using insights from their background research to pose a testable hypothesis and develop experimental strategies for investigating it.', 7),
    ('CHEMISTRY', 4, 'Conducting the Experiment', 'During this stage, under the supervision of the teacher in a school laboratory, each student carries out the experiment they designed.', 8),
    ('CHEMISTRY', 5, 'Data Analysis and Conclusions', 'Once the experiment is complete, students are ready to critically analyse their data and draw justifiable conclusions.', 8),
    ('CHEMISTRY', 6, 'Finalising the Chemistry in Practice Investigation Report', 'During this final stage, which, it is envisaged to take up to 4 hours to complete, students draw upon their investigative log, which outlines all the stages of their investigation, to compile their final report.', 9),

    ('PHYSICS',   1, 'Initial Response to the Investigation Brief', 'This part of the investigation involves students engaging with an Investigation Brief which provides information about a context involving some physical phenomenon related to the learning in the specification.', 5),
    ('PHYSICS',   2, 'Background Research', 'During this stage of the process, students develop a research question on a particular issue in response to the Investigation Brief and informed by their background research into the topic.', 7),
    ('PHYSICS',   3, 'Designing and Planning the Experiment', 'Whatever approach students decide, this stage will involve students using insights from their background research to pose a testable hypothesis and develop experimental strategies for investigating it.', 7),
    ('PHYSICS',   4, 'Conducting the Experiment', 'During this stage, under the supervision of the teacher in a school laboratory, each student carries out the experiment they designed.', 8),
    ('PHYSICS',   5, 'Data Analysis and Conclusions', 'Once the experiment is complete, students are ready to critically analyse their data and to draw justifiable conclusions.', 9),
    ('PHYSICS',   6, 'Finalising the Physics in Practice Investigation Report', 'During this final stage, which, it is envisaged should take up to 4 hours to complete, students draw upon their investigative log, which outlines all the stages of their investigation, to compile their final report.', 9)
) AS words (subject_code, ordinal, name, description, page) USING (ordinal)
JOIN science_version sv USING (subject_code);

-- Report sections: the same seven headings in all three briefs (p. 7). The science briefs give no
-- per-section indicative content or word counts; the mark allocation (p. 8) lists the criteria instead.
INSERT INTO template_section (version_id, ordinal, label, name, source_ref)
SELECT sv.version_id, heading.ordinal, heading.ordinal::text, heading.name, sv.sec || ' p. 7'
FROM science_version sv
CROSS JOIN (VALUES
    (1, 'Title and Introduction'),
    (2, 'Background Research'),
    (3, 'Designing and Planning'),
    (4, 'Conducting the Experiment'),
    (5, 'Data and Data Analysis'),
    (6, 'Conclusions'),
    (7, 'References')
) AS heading (ordinal, name);

-- Mark allocation (each brief, p. 8): four bands of 50. Band D is assessed across the whole report.
INSERT INTO template_mark_band (version_id, ordinal, label, name, marks, whole_report, criteria, source_ref)
SELECT sv.version_id, band.ordinal, band.label, band.name, 50, band.whole_report, band.criteria, sv.sec || ' p. 8'
FROM science_version sv
CROSS JOIN (VALUES
    (1, 'A', NULL::text, false, ARRAY['Title / Introduction / Research Question', 'Hypothesis', 'Background Research (Secondary Data)', 'Evaluation of Secondary Data', 'Referencing']),
    (2, 'B', NULL::text, false, ARRAY['Experimental Design', 'Experimental Method', 'Safety', 'Fairness', 'Accuracy', 'Selection of Equipment']),
    (3, 'C', NULL::text, false, ARRAY['Experimental Observations (Primary Data)', 'Data Presentation', 'Data Analysis', 'Conclusions']),
    (4, 'D', 'Scientific Literacy', true, ARRAY['Communication', 'Coherence', 'Relevance', 'Reflective Approach'])
) AS band (ordinal, label, name, whole_report, criteria);

-- Which sections each band covers (p. 8): A = 1, 2, 7; B = 3, 4; C = 5, 6; D = none (whole report).
INSERT INTO template_mark_band_section (version_id, band_id, section_id)
SELECT b.version_id, b.id, s.id
FROM science_version sv
JOIN template_mark_band b ON b.version_id = sv.version_id
JOIN template_section s ON s.version_id = sv.version_id
JOIN (VALUES ('A', 1), ('A', 2), ('A', 7), ('B', 3), ('B', 4), ('C', 5), ('C', 6)) AS covers (band, section)
  ON covers.band = b.label AND covers.section = s.ordinal;

-- Checkpoints (design §7.3). The wording is shared and is what teachers review (roadmap Q1); the quote is
-- each document's own sentence. Stage 6 rests on submission step 3 of each brief (p. 4).
INSERT INTO template_checkpoint (version_id, stage_id, ordinal, text, basis, source_quote, source_ref)
SELECT sv.version_id, stage.id, 1, point.text, point.basis, quote.text,
       CASE WHEN point.ordinal = 6 THEN sv.sec ELSE sv.ncca END || ' p. ' || quote.page
FROM (VALUES
    (1, 'Initial ideas discussed with the teacher', 'DESCRIBED'),
    (2, 'Investigative log shared with the teacher', 'EXPLICIT'),
    (3, 'Plan discussed with the teacher (feasibility and safety)', 'DESCRIBED'),
    (4, 'Experiment carried out under supervision, in line with the research and planning already shared', 'EXPLICIT'),
    (5, 'Data analysis shared with the teacher', 'EXPLICIT'),
    (6, 'Final report submitted to the teacher', 'EXPLICIT')
) AS point (ordinal, text, basis)
JOIN (VALUES
    ('BIOLOGY',   1, 'Interacting with the students at this stage provides an opportunity to familiarise themselves with their initial idea and to identify any gaps in understanding, or in some cases misunderstanding.', 6),
    ('BIOLOGY',   2, 'It is advisable that the students’ investigative logs are shared with the teacher to facilitate regular check-ins with the students’ work, supporting the teacher in the ongoing process of authentication.', 7),
    ('BIOLOGY',   3, 'Discussions between the teacher and student on the feasibility and manageability of their proposed plan supports an understanding of limitations such as safety, lack of equipment or time.', 7),
    ('BIOLOGY',   4, 'An important part of the ongoing authentication process is that the teacher is satisfied that the experiment conducted by the student is in line with their research and planning, which has been shared with them during the stages of the process.', 8),
    ('BIOLOGY',   5, 'Again, sharing the data analysis with the teacher is an important step in the ongoing authentication process.', 9),
    ('BIOLOGY',   6, 'Once you are satisfied that the PDF copy of the report you have printed is complete, you should submit the digital version of the report to your class teacher.', 4),

    ('CHEMISTRY', 1, 'Interacting with the students at this stage provides an opportunity to familiarise themselves with their initial idea and to identify any gaps in understanding, or in some cases misunderstanding.', 6),
    ('CHEMISTRY', 2, 'It is advisable that the students’ investigative logs are shared with the teacher, to facilitate regular check-ins with the students’ work, supporting the teacher in the ongoing process of authentication.', 7),
    ('CHEMISTRY', 3, 'Discussions between the teacher and student on the feasibility and manageability of their proposed plan supports an understanding of limitations such as safety, lack of equipment or time.', 7),
    ('CHEMISTRY', 4, 'An important part of the ongoing authentication process is that the teacher is satisfied to give an undertaking that the experiment conducted by a student is in line with their research and planning, which has been shared with them during the stages of the process.', 8),
    ('CHEMISTRY', 5, 'Again, sharing the data analysis with the teacher is an important step in the ongoing authentication process.', 9),
    ('CHEMISTRY', 6, 'Once you are satisfied that the PDF copy of the report you have printed is complete, you should submit the digital version of the report to your class teacher.', 4),

    ('PHYSICS',   1, 'Interacting with the students at this stage provides an opportunity to familiarise themselves with their initial idea, and to identify any gaps in understanding or in some cases misunderstanding.', 6),
    ('PHYSICS',   2, 'It is advisable that the students’ investigative logs are shared with the teacher to facilitate regular check-ins with the students’ work, supporting the teacher in the ongoing process of authentication.', 7),
    ('PHYSICS',   3, 'Discussions between the teacher and student on the feasibility and manageability of their proposed plan supports an understanding of limitations such as safety, lack of equipment or time.', 7),
    ('PHYSICS',   4, 'An important part of the ongoing authentication process is that the teacher is satisfied to give an undertaking that the experiment conducted by a student is in line with their research and planning, which has been shared with them during the stages of the process.', 8),
    ('PHYSICS',   5, 'Again, sharing the data analysis with the teacher is an important step in the ongoing authentication process.', 9),
    ('PHYSICS',   6, 'Once you are satisfied that the PDF copy of the report you have printed is complete, you should submit the digital version of the report to your class teacher.', 4)
) AS quote (subject_code, ordinal, text, page) ON quote.ordinal = point.ordinal
JOIN science_version sv USING (subject_code)
JOIN template_stage stage ON stage.version_id = sv.version_id AND stage.ordinal = point.ordinal;

-- Prompts, Stage 1 (each guideline, p. 6): identical apart from the subject's name.
INSERT INTO template_prompt (version_id, stage_id, ordinal, heading, text, source_ref)
SELECT sv.version_id, stage.id, prompt.ordinal,
       'Guiding or prompt questions that may support students in this process include',
       replace(prompt.text, '{subject}', sv.subject_word), sv.ncca || ' p. 6'
FROM science_version sv
JOIN template_stage stage ON stage.version_id = sv.version_id AND stage.ordinal = 1
CROSS JOIN (VALUES
    (1, 'What do I already know about the topic and/or issue in the Investigation Brief?'),
    (2, 'Do I need to understand more about the topic and/or issue and how will I do this?'),
    (3, 'What research and experimental activities in {subject} connect to the topic and/or issue in the Investigation Brief?'),
    (4, 'What area of the topic and/or issue am I interested in researching? What sources of information will be useful and how will I maintain a record of the research?'),
    (5, 'What experiment am I interested in completing? Could I extend or adapt an experiment I have already completed in {subject} or could I develop an original approach to an experiment?')
) AS prompt (ordinal, text);

-- Prompts, Stage 5: the data-analysis list (Biology p. 9, Chemistry p. 8, Physics p. 9). Physics writes
-- "calculations and graphs" where the others write "calculations and/or graphs".
INSERT INTO template_prompt (version_id, stage_id, ordinal, heading, text, source_ref)
SELECT sv.version_id, stage.id, item.ordinal, 'Data analysis may include', item.text, sv.ncca || ' p. ' || item.page
FROM (VALUES
    ('BIOLOGY',   1, 'evaluating data in terms of accuracy, precision, repeatability and reproducibility', 9),
    ('BIOLOGY',   2, 'calculations and/or graphs to facilitate the identification of patterns and relationships', 9),
    ('BIOLOGY',   3, 'justifications for any iterations of the process', 9),
    ('BIOLOGY',   4, 'the identification of and explanation for any initial anomalous results or observations', 9),
    ('CHEMISTRY', 1, 'evaluating data in terms of accuracy, precision, repeatability and reproducibility', 8),
    ('CHEMISTRY', 2, 'calculations and/or graphs to facilitate the identification of patterns and relationships', 8),
    ('CHEMISTRY', 3, 'justifications for any iterations of the process', 8),
    ('CHEMISTRY', 4, 'the identification of and explanation for any initial anomalous results or observations', 8),
    ('PHYSICS',   1, 'evaluating data in terms of accuracy, precision, repeatability and reproducibility', 9),
    ('PHYSICS',   2, 'calculations and graphs to facilitate the identification of patterns and relationships', 9),
    ('PHYSICS',   3, 'justifications for any iterations of the process', 9),
    ('PHYSICS',   4, 'the identification of and explanation for any initial anomalous results or observations', 9)
) AS item (subject_code, ordinal, text, page)
JOIN science_version sv USING (subject_code)
JOIN template_stage stage ON stage.version_id = sv.version_id AND stage.ordinal = 5;

-- Publish last: the V7 triggers freeze the structure from here on.
UPDATE template_version v SET status = 'PUBLISHED', published_at = now()
FROM science_version sv WHERE v.id = sv.version_id;

DROP VIEW science_version;
DROP TABLE science;
