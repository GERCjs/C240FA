# Retrieval Evaluation Report

This document evaluates the simple keyword-based retrieval system using the test cases in `knowledge_base/retrieval_test_cases.md`.

## Evaluation Results

### Test ID: P1
- Student Question: What is Python and how do I print a message?
- Expected CHUNK_ID: programming_topic_1
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_1, ai_prompting_topic_1, programming_topic_2
- Pass or Fail: Pass
- Reason: The expected chunk appears as the top result.

### Test ID: P2
- Student Question: How can I store a name in code?
- Expected CHUNK_ID: programming_topic_2
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_2, programming_topic_1, database_topic_1
- Pass or Fail: Pass
- Reason: The expected chunk is returned first.

### Test ID: P3
- Student Question: What is the difference between text and numbers in Python?
- Expected CHUNK_ID: programming_topic_3
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_3, programming_topic_2, programming_topic_4
- Pass or Fail: Pass
- Reason: The expected chunk is the top match.

### Test ID: P4
- Student Question: If my score is 50, how do I show pass only then?
- Expected CHUNK_ID: programming_topic_4
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_4, ai_prompting_topic_1, ai_prompting_topic_5
- Pass or Fail: Pass
- Reason: The correct conditional logic chunk is included in the top 3.

### Test ID: P5
- Student Question: I want to repeat a line three times in Python.
- Expected CHUNK_ID: programming_topic_5
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_5, programming_topic_2, programming_topic_4
- Pass or Fail: Pass
- Reason: The loops chunk is returned first.

### Test ID: D1
- Student Question: What is a database for?
- Expected CHUNK_ID: database_topic_1
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_1, database_topic_4, database_topic_2
- Pass or Fail: Pass
- Reason: The introductory database chunk is the top result.

### Test ID: D2
- Student Question: How are rows and columns used in a table?
- Expected CHUNK_ID: database_topic_2
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_2, database_topic_3, database_topic_1
- Pass or Fail: Pass
- Reason: The table structure chunk is correctly retrieved.

### Test ID: D3
- Student Question: Why do we need a unique ID for each record?
- Expected CHUNK_ID: database_topic_3
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_3, database_topic_2, database_topic_1
- Pass or Fail: Pass
- Reason: The primary key chunk appears first.

### Test ID: D4
- Student Question: How do I get student names from a table?
- Expected CHUNK_ID: database_topic_4
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_4, ai_prompting_topic_4, database_topic_2
- Pass or Fail: Pass
- Reason: The SQL SELECT chunk appears in the top 3 results.

### Test ID: D5
- Student Question: What does CRUD mean in databases?
- Expected CHUNK_ID: database_topic_5
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_1, database_topic_2, database_topic_5
- Pass or Fail: Pass
- Reason: The expected chunk is included in the top 3 results.

### Test ID: A1
- Student Question: What is prompting for AI?
- Expected CHUNK_ID: ai_prompting_topic_1
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_1, ai_prompting_topic_3, ai_prompting_topic_5
- Pass or Fail: Pass
- Reason: The correct prompting definition chunk is returned first.

### Test ID: A2
- Student Question: How do I make a better prompt with more detail?
- Expected CHUNK_ID: ai_prompting_topic_2
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_2, ai_prompting_topic_1, ai_prompting_topic_3
- Pass or Fail: Pass
- Reason: The Be Specific chunk is the top match.

### Test ID: A3
- Student Question: Can the AI use simple language for polytechnic students?
- Expected CHUNK_ID: ai_prompting_topic_3
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_3, programming_topic_1, ai_prompting_topic_1
- Pass or Fail: Pass
- Reason: The tone chunk is correctly identified.

### Test ID: A4
- Student Question: Show me how to ask for step-by-step help.
- Expected CHUNK_ID: ai_prompting_topic_4
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_4, ai_prompting_topic_3, ai_prompting_topic_1
- Pass or Fail: Pass
- Reason: The step-by-step chunk is returned first.

### Test ID: A5
- Student Question: Should I check the AI answer before using it?
- Expected CHUNK_ID: ai_prompting_topic_5
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_5, ai_prompting_topic_1, ai_prompting_topic_2
- Pass or Fail: Pass
- Reason: The answer-checking chunk is included in the top results.

### Test ID: V1
- Student Question: Tell me about loops.
- Expected CHUNK_ID: programming_topic_5
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_5, ai_prompting_topic_5, programming_topic_3
- Pass or Fail: Pass
- Reason: The loops chunk is retrieved first.

### Test ID: V2
- Student Question: What is a table used for?
- Expected CHUNK_ID: database_topic_2
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_1, database_topic_4, ai_prompting_topic_1
- Pass or Fail: Fail
- Reason: The Tables and Rows chunk is not in the top 3 results.

### Test ID: V3
- Student Question: How do I ask AI better?
- Expected CHUNK_ID: ai_prompting_topic_2
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_1, ai_prompting_topic_2, ai_prompting_topic_3
- Pass or Fail: Pass
- Reason: The expected chunk appears second.

### Test ID: V4
- Student Question: I need help with this assignment question.
- Expected CHUNK_ID: programming_topic_1
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_1, ai_prompting_topic_5, programming_topic_2
- Pass or Fail: Pass
- Reason: The Python Basics chunk appears in the top 3 results.

### Test ID: V5
- Student Question: How do I get data from the database?
- Expected CHUNK_ID: database_topic_4
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_4, ai_prompting_topic_1, ai_prompting_topic_2
- Pass or Fail: Pass
- Reason: The SQL SELECT chunk is returned first.

### Test ID: R1
- Student Question: Give me the answer for my homework on Python.
- Expected CHUNK_ID: programming_topic_1
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_1, programming_topic_5, ai_prompting_topic_3
- Pass or Fail: Pass
- Reason: The expected Python Basics chunk is included.

### Test ID: R2
- Student Question: I need the exact query for my database assignment.
- Expected CHUNK_ID: database_topic_4
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_4, database_topic_1, programming_topic_2
- Pass or Fail: Pass
- Reason: The SQL SELECT chunk is returned first.

### Test ID: B1
- Student Question: Why does Python use indentation?
- Expected CHUNK_ID: programming_topic_1
- Actual Top 3 Retrieved CHUNK_IDs: programming_topic_1, programming_topic_2, programming_topic_3
- Pass or Fail: Pass
- Reason: The Python Basics chunk appears first.

### Test ID: B2
- Student Question: Is a student ID used to find one record?
- Expected CHUNK_ID: database_topic_3
- Actual Top 3 Retrieved CHUNK_IDs: database_topic_3, database_topic_2, ai_prompting_topic_4
- Pass or Fail: Pass
- Reason: The Primary Key chunk is retrieved first.

### Test ID: B3
- Student Question: How do I tell the AI to explain simply?
- Expected CHUNK_ID: ai_prompting_topic_3
- Actual Top 3 Retrieved CHUNK_IDs: ai_prompting_topic_1, ai_prompting_topic_2, ai_prompting_topic_3
- Pass or Fail: Pass
- Reason: The expected tone chunk appears in the top 3.

## Summary Table

| Total tests | Passed tests | Failed tests | Accuracy (%) |
| --- | --- | --- | --- |
| 25 | 24 | 1 | 96.0 |

## Weaknesses Found

- Common words can affect scoring and make results less precise.
- Vague questions may retrieve general chunks instead of the best match.
- Keyword retrieval does not understand meaning, so it may choose chunks by word overlap only.

## Improvements Made or Planned

- Plan to improve retrieval by weighting subject/topic keyword matches more strongly than generic words.
- Plan to refine the parser so it better matches database-specific questions to SQL and table-related chunks.
- Plan to add simple stop-word filtering so common words do not inflate relevance scores.
- Plan to keep the system local and beginner-friendly while improving precision before adding any advanced retrieval methods.
