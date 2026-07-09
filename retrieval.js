const fs = require("fs");
const path = require("path");

const KNOWLEDGE_FOLDER = path.join(__dirname, "knowledge_base");

function readKnowledgeFiles(folder) {
    const files = fs.readdirSync(folder).filter((name) => name.endsWith(".txt"));
    return files.map((fileName) => {
        const filePath = path.join(folder, fileName);
        const text = fs.readFileSync(filePath, "utf8");
        return text;
    });
}

function tokenize(text) {
    const matches = text.toLowerCase().match(/\b[a-z0-9]+\b/g);
    return matches ? matches.filter((word) => word.length > 0) : [];
}

function parseChunks(text) {
    const rawChunks = text.split(/(?=\[CHUNK_ID:\s*)/g).filter((chunk) => chunk.trim().length > 0);

    return rawChunks.map((chunkText) => {
        const chunkIdMatch = chunkText.match(/^\[CHUNK_ID:\s*(.+?)\]/m);
        const subjectMatch = chunkText.match(/^Subject:\s*(.+)$/m);
        const topicMatch = chunkText.match(/^Topic:\s*(.+)$/m);
        const keywordsMatch = chunkText.match(/^Keywords:\s*(.+)$/m);
        const difficultyMatch = chunkText.match(/^Difficulty:\s*(.+)$/m);
        const explanationMatch = chunkText.match(/^Explanation:\s*(.+)$/m);
        const usefulForMatch = chunkText.match(/^Useful For:\s*(.+)$/m);

        return {
            chunk_id: chunkIdMatch ? chunkIdMatch[1].trim() : "",
            subject: subjectMatch ? subjectMatch[1].trim() : "",
            topic: topicMatch ? topicMatch[1].trim() : "",
            keywords: keywordsMatch ? keywordsMatch[1].split(/,\s*/).map((word) => word.trim()) : [],
            difficulty: difficultyMatch ? difficultyMatch[1].trim() : "",
            explanation: explanationMatch ? explanationMatch[1].trim() : "",
            usefulFor: usefulForMatch ? usefulForMatch[1].trim() : "",
            content: chunkText.trim()
        };
    });
}

function buildIndex(chunks) {
    return chunks.map((chunk) => {
        const topicTerms = tokenize(chunk.topic);
        const explanationTerms = tokenize(chunk.explanation);
        const usefulForTerms = tokenize(chunk.usefulFor);
        const keywordTerms = chunk.keywords.reduce((acc, keyword) => {
            return acc.concat(tokenize(keyword));
        }, []);

        return {
            ...chunk,
            searchTerms: Array.from(new Set([...topicTerms, ...explanationTerms, ...usefulForTerms, ...keywordTerms]))
        };
    });
}

function countMatches(question, chunk) {
    const questionTokens = new Set(tokenize(question));
    const matchedKeywords = [];
    let score = 0;
    const questionLower = question.toLowerCase();

    chunk.keywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase();
        if (keywordLower.length > 0 && questionLower.includes(keywordLower)) {
            matchedKeywords.push(keyword);
            score += 2;
        }
    });

    if (chunk.topic && questionLower.includes(chunk.topic.toLowerCase())) {
        if (!matchedKeywords.includes(chunk.topic)) {
            matchedKeywords.push(chunk.topic);
        }
        score += 2;
    }

    chunk.searchTerms.forEach((term) => {
        if (questionTokens.has(term) && !matchedKeywords.includes(term)) {
            matchedKeywords.push(term);
            score += 1;
        }
    });

    return { score, matched_keywords: matchedKeywords };
}

function findRelevantChunks(question, chunks, limit = 3) {
    const indexedChunks = buildIndex(chunks);

    const scoredChunks = indexedChunks.map((chunk) => {
        const { score, matched_keywords } = countMatches(question, chunk);
        return {
            chunk_id: chunk.chunk_id,
            subject: chunk.subject,
            topic: chunk.topic,
            difficulty: chunk.difficulty,
            explanation: chunk.explanation,
            relevance_score: score,
            matched_keywords,
            content: chunk.content
        };
    });

    return scoredChunks
        .filter((item) => item.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, limit);
}

function loadKnowledgeChunks() {
    try {
        const texts = readKnowledgeFiles(KNOWLEDGE_FOLDER);
        const allChunks = texts.flatMap((text) => parseChunks(text));
        return allChunks;
    } catch (err) {
        console.log("Error loading knowledge base:", err.message);
        return [];
    }
}

module.exports = {
    readKnowledgeFiles,
    parseChunks,
    findRelevantChunks,
    loadKnowledgeChunks
};
