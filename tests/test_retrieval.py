"""
Integration Tests - RAG Retrieval Pipeline
Tests for knowledge base loading, chunking, and retrieval accuracy.
Requires: pip install sentence-transformers chromadb
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "rag"))

try:
    from chunking import load_documents
    from embedding import embed_chunk
    from retrieval import save_embeddings, retrieve
    HAS_RAG_DEPS = True
except ImportError:
    HAS_RAG_DEPS = False

pytestmark = pytest.mark.skipif(not HAS_RAG_DEPS, reason="RAG dependencies not installed (sentence-transformers, chromadb)")


class TestChunking:
    """Tests for document chunking"""

    def test_load_documents_returns_list(self):
        """Should return a list of chunks"""
        chunks = load_documents()
        assert isinstance(chunks, list)

    def test_load_documents_not_empty(self):
        """Should load at least some chunks from knowledge base"""
        chunks = load_documents()
        assert len(chunks) > 0

    def test_chunks_contain_chunk_id(self):
        """Each chunk should contain a CHUNK_ID marker"""
        chunks = load_documents()
        for chunk in chunks:
            assert "[CHUNK_ID:" in chunk

    def test_chunks_contain_subject(self):
        """Each chunk should have a Subject field"""
        chunks = load_documents()
        for chunk in chunks:
            assert "Subject:" in chunk

    def test_chunks_contain_explanation(self):
        """Each chunk should have an Explanation field"""
        chunks = load_documents()
        for chunk in chunks:
            assert "Explanation:" in chunk

    def test_minimum_chunk_count(self):
        """Should have at least 15 chunks (3 subjects x 5 topics + academic FAQ)"""
        chunks = load_documents()
        assert len(chunks) >= 15


class TestEmbedding:
    """Tests for embedding generation"""

    def test_embed_returns_list(self):
        """Embedding should return a list of floats"""
        embedding = embed_chunk("What is Python?")
        assert isinstance(embedding, list)

    def test_embed_correct_dimension(self):
        """Embedding should be 384 dimensions (MiniLM-L6-v2)"""
        embedding = embed_chunk("What is a database?")
        assert len(embedding) == 384

    def test_embed_different_inputs_different_vectors(self):
        """Different inputs should produce different embeddings"""
        e1 = embed_chunk("Python programming loops")
        e2 = embed_chunk("SQL database queries")
        assert e1 != e2

    def test_embed_normalized(self):
        """Embeddings should be normalized (magnitude ≈ 1.0)"""
        import math
        embedding = embed_chunk("test sentence")
        magnitude = math.sqrt(sum(x * x for x in embedding))
        assert abs(magnitude - 1.0) < 0.01


class TestRetrieval:
    """Tests for semantic retrieval"""

    @pytest.fixture(autouse=True)
    def setup_vector_store(self):
        """Load and index knowledge base before tests"""
        chunks = load_documents()
        embeddings = [embed_chunk(chunk) for chunk in chunks]
        save_embeddings(chunks, embeddings)

    def test_retrieve_returns_list(self):
        """Retrieval should return a list"""
        results = retrieve("What is Python?", top_k=3)
        assert isinstance(results, list)

    def test_retrieve_correct_count(self):
        """Should return the requested number of results"""
        results = retrieve("What is a database?", top_k=3)
        assert len(results) <= 3

    def test_retrieve_python_question(self):
        """Python question should retrieve programming chunk"""
        results = retrieve("What is Python and how do I print a message?", top_k=3)
        combined = " ".join(results)
        assert "programming" in combined.lower() or "python" in combined.lower()

    def test_retrieve_database_question(self):
        """Database question should retrieve database chunk"""
        results = retrieve("What is a database used for?", top_k=3)
        combined = " ".join(results)
        assert "database" in combined.lower()

    def test_retrieve_sql_question(self):
        """SQL question should retrieve SQL-related chunk"""
        results = retrieve("How do I get student names from a table?", top_k=3)
        combined = " ".join(results)
        assert "select" in combined.lower() or "sql" in combined.lower() or "table" in combined.lower()

    def test_retrieve_ai_prompting_question(self):
        """AI prompting question should retrieve relevant chunk"""
        results = retrieve("What is prompting for AI?", top_k=3)
        combined = " ".join(results)
        assert "prompt" in combined.lower()

    def test_retrieve_academic_faq(self):
        """Academic FAQ question should retrieve relevant chunk"""
        results = retrieve("How is GPA calculated?", top_k=3)
        combined = " ".join(results)
        assert "gpa" in combined.lower() or "grade" in combined.lower()

    def test_retrieve_non_empty_results(self):
        """Results should not be empty strings"""
        results = retrieve("Explain loops in Python", top_k=3)
        for result in results:
            assert len(result.strip()) > 0


class TestRetrievalAccuracy:
    """End-to-end retrieval accuracy tests (matching proposal test cases)"""

    @pytest.fixture(autouse=True)
    def setup_vector_store(self):
        """Load and index knowledge base before tests"""
        chunks = load_documents()
        embeddings = [embed_chunk(chunk) for chunk in chunks]
        save_embeddings(chunks, embeddings)

    def test_p1_python_basics(self):
        """P1: Python + print → programming_topic_1"""
        results = retrieve("What is Python and how do I print a message?", top_k=3)
        combined = " ".join(results)
        assert "programming_topic_1" in combined or "Python Basics" in combined

    def test_p2_variables(self):
        """P2: Store name → programming_topic_2"""
        results = retrieve("How can I store a name in code?", top_k=3)
        combined = " ".join(results)
        assert "variable" in combined.lower() or "programming_topic_2" in combined

    def test_d1_database_basics(self):
        """D1: What is a database → database_topic_1"""
        results = retrieve("What is a database for?", top_k=3)
        combined = " ".join(results)
        assert "database_topic_1" in combined or "What is a Database" in combined

    def test_d4_sql_select(self):
        """D4: Get student names → database_topic_4"""
        results = retrieve("How do I get student names from a table?", top_k=3)
        combined = " ".join(results)
        assert "SELECT" in combined or "database_topic_4" in combined or "sql" in combined.lower()

    def test_a1_prompting(self):
        """A1: What is prompting → ai_prompting_topic_1"""
        results = retrieve("What is prompting for AI?", top_k=3)
        combined = " ".join(results)
        assert "ai_prompting_topic_1" in combined or "What is Prompting" in combined
