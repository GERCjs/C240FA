AI Learning Assistant - RAG Backend
Overview

This project implements a Retrieval-Augmented Generation (RAG) system for an AI Learning Assistant.

The system retrieves relevant learning materials from the local knowledge base and uses Gemini 2.5 Flash to generate student-friendly answers.

RAG Pipeline
Student Question
        AI Learning Assistant - RAG Backend

        ## Overview

        This project implements a Retrieval-Augmented Generation (RAG) system for an AI Learning Assistant.

        The system retrieves relevant learning materials from the local knowledge base and uses Gemini 2.5 Flash to generate student-friendly answers.

        ## RAG Pipeline

        Student Question

                ↓

        Chunking

                ↓

        Embedding

                ↓

        ChromaDB Vector Search

                ↓

        Retrieve Relevant Knowledge

                ↓

        Gemini 2.5 Flash

                ↓

        Generated Answer

        ## Project Structure

        ```
        rag/
        ├── chunking.py
        ├── embedding.py
        ├── retrieval.py
        ├── generator.py
        └── rag_pipeline.py

        knowledge_base/
        ├── ai_prompting.txt
        ├── database.txt
        ├── programming.txt
        ├── retrieval_evaluation.md
        └── retrieval_test_cases.md
        ```

        ## File Responsibilities

        ### `chunking.py`
        - Loads all knowledge base files
        - Splits documents into chunks using [CHUNK_ID:]
        - Prepares knowledge for embedding

        ### `embedding.py`
        - Uses SentenceTransformer
        - Converts text chunks into vector embeddings
        - Generates semantic representations for retrieval

        ### `retrieval.py`
        - Stores embeddings in ChromaDB
        - Performs vector similarity search
        - Retrieves the most relevant chunks

        ### `generator.py`
        - Connects to Gemini 2.5 Flash
        - Uses retrieved context to generate answers

        ### `rag_pipeline.py`
        - Main entry point
        - Combines retrieval and generation into a complete RAG workflow

        ## Requirements

        ### Python Version

        Recommended:

        Python 3.12+

        Current development version:

        Python 3.12.10

        ### Required Python Packages

        Install all dependencies:

        ```
        pip install sentence-transformers chromadb google-genai python-dotenv
        ```

        ### Gemini API Setup

        Create a `.env` file in the project root:

        ```
        GEMINI_API_KEY=YOUR_API_KEY_HERE
        ```

        Get your API key from Google AI Studio. "https://aistudio.google.com/apikey" 

        ## Running the System

        Run:

        ```
        python rag/rag_pipeline.py
        ```

        ### Example:

        Ask a question (or type exit):
        What is a database?

        The system will:

        - Convert the question into embeddings
        - Search ChromaDB for relevant chunks
        - Retrieve the most relevant knowledge
        - Send the context to Gemini
        - Generate a student-friendly answer

        ## Current Dependencies

        | Package | Purpose |
        |---|---|
        | sentence-transformers | Generate embeddings |
        | chromadb | Vector database |
        | google-genai | Gemini API |
        | python-dotenv | Load environment variables |

        ## Current Status

        ### Completed:

        - Knowledge Base Loading
        - Chunking
        - Embedding Generation
        - ChromaDB Vector Store
        - Semantic Retrieval
        - Gemini Integration
        - End-to-End RAG Pipeline

        ### Planned:

        - Express/EJS Frontend Integration
        - Chat History Storage
        - User Authentication
        - Retrieval Evaluation Dashboard

        Node.js Dependencies

Install the required packages:

npm install express ejs mysql2 bcrypt express-session dotenv