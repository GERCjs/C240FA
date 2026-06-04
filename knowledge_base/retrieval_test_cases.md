# Knowledge Retrieval Test Cases

These test cases are designed to check whether the Knowledge Retrieval Agent can find the correct chunk from the local knowledge base.

---

## Programming Questions

### Test ID: P1
- Student Question: What is Python and how do I print a message?
- Expected Subject: Programming
- Expected Topic: Python Basics
- Expected CHUNK_ID: programming_topic_1
- Why this chunk should be retrieved: The question asks for a basic Python introduction and printing, which matches the Python Basics chunk.

### Test ID: P2
- Student Question: How can I store a name in code?
- Expected Subject: Programming
- Expected Topic: Variables
- Expected CHUNK_ID: programming_topic_2
- Why this chunk should be retrieved: The student wants to learn how to keep data in a program, which is explained by the Variables chunk.

### Test ID: P3
- Student Question: What is the difference between text and numbers in Python?
- Expected Subject: Programming
- Expected Topic: Data Types
- Expected CHUNK_ID: programming_topic_3
- Why this chunk should be retrieved: The question refers to different kinds of information, matching the Data Types chunk.

### Test ID: P4
- Student Question: If my score is 50, how do I show pass only then?
- Expected Subject: Programming
- Expected Topic: If Statements
- Expected CHUNK_ID: programming_topic_4
- Why this chunk should be retrieved: The student asks about a conditional decision, so the If Statements chunk is the correct match.

### Test ID: P5
- Student Question: I want to repeat a line three times in Python.
- Expected Subject: Programming
- Expected Topic: Loops
- Expected CHUNK_ID: programming_topic_5
- Why this chunk should be retrieved: The student asks about repeating code, which is explained by the Loops chunk.

---

## Database Questions

### Test ID: D1
- Student Question: What is a database for?
- Expected Subject: Database
- Expected Topic: What is a Database?
- Expected CHUNK_ID: database_topic_1
- Why this chunk should be retrieved: This is a general question about the purpose of databases, matching the introductory database chunk.

### Test ID: D2
- Student Question: How are rows and columns used in a table?
- Expected Subject: Database
- Expected Topic: Tables and Rows
- Expected CHUNK_ID: database_topic_2
- Why this chunk should be retrieved: The student asks about table structure, which is covered by the Tables and Rows chunk.

### Test ID: D3
- Student Question: Why do we need a unique ID for each record?
- Expected Subject: Database
- Expected Topic: Primary Key
- Expected CHUNK_ID: database_topic_3
- Why this chunk should be retrieved: The question refers to unique record identification, matching the Primary Key chunk.

### Test ID: D4
- Student Question: How do I get student names from a table?
- Expected Subject: Database
- Expected Topic: SQL SELECT
- Expected CHUNK_ID: database_topic_4
- Why this chunk should be retrieved: This asks about retrieving data from a table, which is exactly what the SQL SELECT chunk explains.

### Test ID: D5
- Student Question: What does CRUD mean in databases?
- Expected Subject: Database
- Expected Topic: CRUD Operations
- Expected CHUNK_ID: database_topic_5
- Why this chunk should be retrieved: The question asks directly about CRUD, so the CRUD Operations chunk is the relevant content.

---

## AI / Prompt Engineering Questions

### Test ID: A1
- Student Question: What is prompting for AI?
- Expected Subject: AI Prompting
- Expected Topic: What is Prompting?
- Expected CHUNK_ID: ai_prompting_topic_1
- Why this chunk should be retrieved: The question asks for the basic definition of prompting, which is covered by this chunk.

### Test ID: A2
- Student Question: How do I make a better prompt with more detail?
- Expected Subject: AI Prompting
- Expected Topic: Be Specific
- Expected CHUNK_ID: ai_prompting_topic_2
- Why this chunk should be retrieved: The student wants guidance on adding detail, matching the Be Specific chunk.

### Test ID: A3
- Student Question: Can the AI use simple language for polytechnic students?
- Expected Subject: AI Prompting
- Expected Topic: Use the Right Tone
- Expected CHUNK_ID: ai_prompting_topic_3
- Why this chunk should be retrieved: The question is about tone and audience, which is the focus of the Use the Right Tone chunk.

### Test ID: A4
- Student Question: Show me how to ask for step-by-step help.
- Expected Subject: AI Prompting
- Expected Topic: Ask for Step-by-Step Help
- Expected CHUNK_ID: ai_prompting_topic_4
- Why this chunk should be retrieved: The student asks for procedural guidance, making the step-by-step chunk the correct match.

### Test ID: A5
- Student Question: Should I check the AI answer before using it?
- Expected Subject: AI Prompting
- Expected Topic: Check the Answer
- Expected CHUNK_ID: ai_prompting_topic_5
- Why this chunk should be retrieved: The question is about reviewing AI responses, which is the topic of this chunk.

---

## Vague or Clarification Questions

### Test ID: V1
- Student Question: Tell me about loops.
- Expected Subject: Programming
- Expected Topic: Loops
- Expected CHUNK_ID: programming_topic_5
- Why this chunk should be retrieved: The question is broad but mentions loops, so the loop concept chunk is the most relevant.

### Test ID: V2
- Student Question: What is a table used for?
- Expected Subject: Database
- Expected Topic: Tables and Rows
- Expected CHUNK_ID: database_topic_2
- Why this chunk should be retrieved: The question is vague but clearly asks about tables, making the Tables and Rows chunk appropriate.

### Test ID: V3
- Student Question: How do I ask AI better?
- Expected Subject: AI Prompting
- Expected Topic: Be Specific
- Expected CHUNK_ID: ai_prompting_topic_2
- Why this chunk should be retrieved: The question is general about prompt quality, and the Be Specific chunk gives the best guidance.

### Test ID: V4
- Student Question: I need help with this assignment question.
- Expected Subject: Programming
- Expected Topic: Python Basics
- Expected CHUNK_ID: programming_topic_1
- Why this chunk should be retrieved: The question is vague and assignment-related, but the retrieval agent should still return a basic Python chunk relevant to a simple coding question.

### Test ID: V5
- Student Question: How do I get data from the database?
- Expected Subject: Database
- Expected Topic: SQL SELECT
- Expected CHUNK_ID: database_topic_4
- Why this chunk should be retrieved: The question asks about retrieving data, matching the SQL SELECT chunk.

---

## Academic Integrity Risk Questions

### Test ID: R1
- Student Question: Give me the answer for my homework on Python.
- Expected Subject: Programming
- Expected Topic: Python Basics
- Expected CHUNK_ID: programming_topic_1
- Why this chunk should be retrieved: The question signals homework risk, but retrieval should still return a safe learning chunk about Python basics.

### Test ID: R2
- Student Question: I need the exact query for my database assignment.
- Expected Subject: Database
- Expected Topic: SQL SELECT
- Expected CHUNK_ID: database_topic_4
- Why this chunk should be retrieved: The question is assignment-focused, and the retrieval agent should bring back the SQL SELECT learning chunk rather than a direct answer.

---

## Mixed Beginner Questions

### Test ID: B1
- Student Question: Why does Python use indentation?
- Expected Subject: Programming
- Expected Topic: Python Basics
- Expected CHUNK_ID: programming_topic_1
- Why this chunk should be retrieved: The student asks about Python style and basics, which is covered in the Python Basics chunk.

### Test ID: B2
- Student Question: Is a student ID used to find one record?
- Expected Subject: Database
- Expected Topic: Primary Key
- Expected CHUNK_ID: database_topic_3
- Why this chunk should be retrieved: The question mentions unique identification, matching the Primary Key chunk.

### Test ID: B3
- Student Question: How do I tell the AI to explain simply?
- Expected Subject: AI Prompting
- Expected Topic: Use the Right Tone
- Expected CHUNK_ID: ai_prompting_topic_3
- Why this chunk should be retrieved: The question asks about asking for simple AI explanations, which fits the tone chunk.
