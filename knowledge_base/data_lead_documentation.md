# Data Lead Documentation

## Purpose of the Knowledge Base
The knowledge base is a local set of learning notes for the AI Student Learning Assistant. It stores beginner-friendly content in simple text files so the retrieval system can find useful guidance for student questions.

## Why Content is Split into Chunks
The content is split into chunks so each idea is small, clear, and easy to match. This makes retrieval faster and more reliable because the system can compare a question with short topic units instead of long documents.

## Chunk Format
Each chunk uses the same format so the retrieval system can read it consistently.

- `CHUNK_ID`
  - A unique label for the chunk, such as `programming_topic_1`.
  - This helps the system identify the exact piece of content.

- `Subject`
  - The broad area of learning, such as Programming, Database, or AI Prompting.

- `Topic`
  - The specific concept inside that subject, such as Python Basics or SQL SELECT.

- `Keywords`
  - A list of words and phrases that describe the chunk.
  - These are used for matching student questions to the right content.

- `Difficulty`
  - The skill level of the chunk, for example Beginner.
  - This helps keep the content suitable for polytechnic students.

- `Explanation`
  - A short description of the concept in plain language.
  - It is written for students who are still learning.

- `Example`
  - A simple example that shows the idea in practice.
  - This helps learners see how the concept works.

- `Common Mistake`
  - A typical error that beginners make.
  - It helps students avoid common problems.

- `Useful For`
  - A short note about when the chunk is most helpful.
  - This supports retrieval by clarifying the student need.

## How retrieval.js Searches the Knowledge Base
The `retrieval.js` module reads all `.txt` files from `knowledge_base/` and splits them into chunks using the `CHUNK_ID` marker.

For each student question, the module compares the question with chunk fields:
- `Topic`
- `Keywords`
- `Explanation`
- `Useful For`

It uses simple keyword matching only. The system counts how many matching words appear in the question and the chunk. The top 3 chunks with the highest score are returned as the most relevant results.

## Why Simple Keyword Retrieval was Used
Simple keyword retrieval was chosen because:
- It is easy to understand and implement.
- It works with the local text-based knowledge base.
- It avoids extra complexity while we test the basic retrieval design.
- It is suitable for the school project phase before adding advanced methods.

## Summary of Retrieval Test Cases
The file `knowledge_base/retrieval_test_cases.md` contains 25 test cases.
- 5 programming questions
- 5 database questions
- 5 AI / prompt engineering questions
- 3 vague questions for clarification scenarios
- 2 academic integrity risk questions

Each test case includes:
- Test ID
- Student Question
- Expected Subject
- Expected Topic
- Expected CHUNK_ID
- Why the chunk should be retrieved

## Summary of Retrieval Evaluation Results
The file `knowledge_base/retrieval_evaluation.md` records how the retrieval system performed.
- It compares the expected chunk with the actual top 3 retrieved chunks.
- A test passes when the expected `CHUNK_ID` appears in the top 3 results.
- The evaluation also notes whether each test passed or failed and why.

## Weaknesses of the Current Retrieval Method
The current system has some weaknesses:
- It can return results from a different subject when keywords are shared.
- Vague questions may match general chunks instead of the most correct chunk.
- Common words can increase scores for unrelated chunks.
- The system does not understand meaning, only matching words.

## Realistic Future Improvements
Possible improvements that keep the same architecture:
- Add weight to exact topic matches so topic words matter more than generic words.
- Improve keyword lists with more student wording and synonyms.
- Filter out common stop words like "a", "the", and "for" so they do not affect scores.
- Add a small rule-based fallback for questions that mention assignment risk or clarification.

## Notes for Project Presentation
- The knowledge base is local and simple.
- Chunks make retrieval clear and structured.
- `retrieval.js` proves the basic retrieval step before using any advanced techniques.
- The test case and evaluation files document the system performance clearly.
