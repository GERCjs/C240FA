const fs = require("fs");
const readline = require("readline");
const { loadKnowledgeChunks, findRelevantChunks } = require("./retrieval");

function readPrompt(filePath) {
  return fs.readFileSync(filePath, "utf8").trim();
}

function runTopicDetectionAgent(question, promptText) {
  const lower = question.toLowerCase();

  const academicRisk = [
    "assignment answer",
    "homework answer",
    "give me the answer",
    "exact answer",
    "full solution",
    "homework",
    "assignment",
    "answer for"
  ];

  const vagueTriggers = ["help", "i don't understand", "i dont understand", "what?", "how?"];

  const aiKeywords = [
    "prompt", "prompting", "ai prompt", "instruction", "chatgpt", "hallucination", "tone", "step-by-step", "step by step"
  ];

  const dbKeywords = [
    "database", "sql", "table", "row", "column", "primary key", "foreign key", "crud", "query", "select"
  ];

  const programmingKeywords = [
    "python", "html", "css", "javascript", "variable", "loop", "if statement", "print", "code"
  ];

  const hasAcademicRisk = academicRisk.some((phrase) => lower.includes(phrase));
  const hasVagueQuestion = vagueTriggers.some((phrase) => lower.includes(phrase));
  const hasAIKeyword = aiKeywords.some((word) => lower.includes(word));
  const hasDBKeyword = dbKeywords.some((word) => lower.includes(word));
  const hasProgrammingKeyword = programmingKeywords.some((word) => lower.includes(word));

  if (hasAcademicRisk) {
    return JSON.stringify({
      subject: "Programming",
      topic: "Python Basics",
      intent: "Direct Answer Request",
      difficulty: "Beginner",
      safety_status: "Academic Integrity Risk",
      confidence_score: 85,
      next_step: "Ethics Guidance",
      reason: "The question appears to ask for a direct answer to an assignment or homework request."
    });
  }

  if (hasVagueQuestion && !hasAIKeyword && !hasDBKeyword && !hasProgrammingKeyword) {
    return JSON.stringify({
      subject: "Unknown",
      topic: "Clarification Needed",
      intent: "Clarification Needed",
      difficulty: "Unknown",
      safety_status: "Needs Clarification",
      confidence_score: 70,
      next_step: "Ask Clarification",
      reason: "The question is too vague and needs more detail."
    });
  }

  let subject = "Programming";
  let topic = "Python Basics";

  if (hasAIKeyword) {
    subject = "AI / Prompt Engineering";
    if (lower.includes("prompting") || lower.includes("what is prompting") || lower.includes("what is prompt") || lower.includes("ai prompt")) {
      topic = "What is Prompting?";
    } else if (lower.includes("specific") || lower.includes("more detail") || lower.includes("better prompt")) {
      topic = "Be Specific";
    } else if (lower.includes("tone") || lower.includes("simple language") || lower.includes("polytechnic") || lower.includes("audience")) {
      topic = "Use the Right Tone";
    } else if (lower.includes("step-by-step") || lower.includes("step by step") || lower.includes("ask for step") || lower.includes("steps")) {
      topic = "Ask for Step-by-Step Help";
    } else if (lower.includes("check answer") || lower.includes("review answer") || lower.includes("verify") || lower.includes("confirm")) {
      topic = "Check the Answer";
    } else {
      topic = "What is Prompting?";
    }
  } else if (hasDBKeyword) {
    subject = "Database";
    if (lower.includes("primary key") || lower.includes("foreign key") || lower.includes("student id") || lower.includes("unique id")) {
      topic = "Primary Key";
    } else if (lower.includes("rows") || lower.includes("columns") || lower.includes("row") || lower.includes("column") || lower.includes("table used") || lower.includes("table is used")) {
      topic = "Tables and Rows";
    } else if (lower.includes("select") || lower.includes("query") || lower.includes("retrieve") || lower.includes("student names") || lower.includes("get data") || lower.includes("get student")) {
      topic = "SQL SELECT";
    } else if (lower.includes("crud") || lower.includes("create") || lower.includes("read") || lower.includes("update") || lower.includes("delete")) {
      topic = "CRUD Operations";
    } else {
      topic = "What is a Database?";
    }
  } else if (hasProgrammingKeyword) {
    subject = "Programming";
    if (lower.includes("variable") || lower.includes("store") || lower.includes("name =") || lower.includes("name")) {
      topic = "Variables";
    } else if (lower.includes("text") && lower.includes("number") || lower.includes("data type") || lower.includes("string") || lower.includes("integer") || lower.includes("float")) {
      topic = "Data Types";
    } else if (lower.includes("if statement") || lower.includes("if ") || lower.includes("condition") || lower.includes("pass")) {
      topic = "If Statements";
    } else if (lower.includes("loop") || lower.includes("repeat") || lower.includes("for loop") || lower.includes("times")) {
      topic = "Loops";
    } else if (lower.includes("python") || lower.includes("print") || lower.includes("hello world")) {
      topic = "Python Basics";
    }
  }

  return JSON.stringify({
    subject,
    topic,
    intent: "Explanation",
    difficulty: "Beginner",
    safety_status: "Allowed",
    confidence_score: 90,
    next_step: "Retrieve Knowledge",
    reason: "Simulated topic detection based on simple keyword rules."
  });
}

function parseJsonOutput(jsonText) {
  return JSON.parse(jsonText);
}

function runKnowledgeRetrievalAgent(question, topicOutput, promptText) {
  const chunks = loadKnowledgeChunks();
  const results = findRelevantChunks(question, chunks, 3);
  const relevantChunks = results.map((chunk) => ({
    source_name: "knowledge_base",
    relevant_points: [chunk.content]
  }));
  const cleanedContext = results.map((chunk) => chunk.content).join(" ");

  return JSON.stringify({
    retrieval_status: results.length > 0 ? "Success" : "Insufficient",
    relevant_sources: relevantChunks,
    cleaned_context: results.length > 0 ? cleanedContext : "No relevant content found in the local knowledge base.",
    missing_information: results.length > 0 ? "" : "The local knowledge base does not contain a matching chunk.",
    retrieval_confidence: results.length > 0 ? 85 : 30,
    retrieved_chunks: results
  });
}

function parseChunkFields(chunkContent) {
  const fields = {};
  chunkContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Explanation:")) {
      fields.Explanation = trimmed.replace("Explanation:", "").trim();
    } else if (trimmed.startsWith("Example:")) {
      fields.Example = trimmed.replace("Example:", "").trim();
    } else if (trimmed.startsWith("Common Mistake:")) {
      fields.CommonMistake = trimmed.replace("Common Mistake:", "").trim();
    }
  });
  return fields;
}

function getPracticeQuestion(topic) {
  const lowerTopic = topic.toLowerCase();
  if (lowerTopic.includes("what is prompting")) {
    return "Write one prompt asking an AI to explain SQL SELECT to a beginner.";
  }
  if (lowerTopic.includes("loops")) {
    return "Write one loop that prints the numbers 1 to 5 in Python.";
  }
  if (lowerTopic.includes("sql select") || lowerTopic.includes("select")) {
    return "Write one SQL SELECT question that retrieves student names from a table.";
  }
  if (lowerTopic.includes("python") || lowerTopic.includes("python basics")) {
    return "Write one Python print statement that shows a greeting.";
  }
  return `Write one prompt asking an AI to explain ${topic} to a beginner.`;
}

function buildLearningResponse(topicOutput, retrievalOutput) {
  const topChunk = Array.isArray(retrievalOutput.retrieved_chunks) && retrievalOutput.retrieved_chunks[0];
  const fields = topChunk ? parseChunkFields(topChunk.content) : {};

  const explanation = fields.Explanation ||
    `Here is a simple explanation for ${topicOutput.topic}.`;
  const example = fields.Example ||
    `Use a clear example that matches the topic.`;
  const keyTakeaway = fields.CommonMistake
    ? `A common mistake is: ${fields.CommonMistake}`
    : `A good answer is clear, specific, and easy for a beginner to follow.`;
  const practiceQuestion = getPracticeQuestion(topicOutput.topic);

  return (
    `1. Direct explanation\n${explanation}\n\n` +
    `2. Simple example\n${example}\n\n` +
    `3. Key takeaway\n${keyTakeaway}\n\n` +
    `4. Practice question\n${practiceQuestion}\n\n` +
    `5. Follow-up prompt\nTell me your prompt, and I can help you improve it.`
  );
}

function runLearningAgent(question, topicOutput, retrievalOutput, promptText) {
  if (topicOutput.next_step === "Ethics Guidance") {
    return (
      "Academic integrity guidance: If the student is asking for homework or assignment answers, help them understand the topic instead of giving the final solution. " +
      "Encourage them to practice and explain how to learn the concept safely."
    );
  }

  if (retrievalOutput.retrieval_status !== "Success") {
    return (
      "I could not find enough useful information in the local knowledge base. " +
      "Try asking a more specific question or add more detail."
    );
  }

  return buildLearningResponse(topicOutput, retrievalOutput);
}

function main() {
  const topicPrompt = readPrompt("Topic Detection Agent.md");
  const retrievalPrompt = readPrompt("Knowledge Retrieval Agent.md");
  const learningPrompt = readPrompt("Learning Agent.md");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Enter the student question: ", question => {
    const topicJson = runTopicDetectionAgent(question, topicPrompt);
    const topicOutput = parseJsonOutput(topicJson);

    console.log("\nTopic Detection Agent output:");
    console.log(JSON.stringify(topicOutput, null, 2));

    if (topicOutput.next_step === "Ask Clarification") {
      console.log("\nClarification needed: Please ask the student for more information before continuing.");
      rl.close();
      return;
    }

    if (topicOutput.next_step === "Ethics Guidance") {
      const learningResponse = runLearningAgent(question, topicOutput, {}, learningPrompt);
      console.log("\nFinal response:");
      console.log(learningResponse);
      rl.close();
      return;
    }

    const retrievalJson = runKnowledgeRetrievalAgent(question, topicOutput, retrievalPrompt);
    const retrievalOutput = parseJsonOutput(retrievalJson);

    console.log("\nKnowledge Retrieval Agent output:");
    console.log(JSON.stringify(retrievalOutput, null, 2));

    const finalResponse = runLearningAgent(question, topicOutput, retrievalOutput, learningPrompt);
    console.log("\nFinal student response:");
    console.log(finalResponse);

    rl.close();
  });
}

main();
