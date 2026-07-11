-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: c240_ai
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `assignments`
--

DROP TABLE IF EXISTS `assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `module` varchar(100) NOT NULL,
  `description` text,
  `deadline` datetime NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  `study_plan` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assignments`
--

LOCK TABLES `assignments` WRITE;
/*!40000 ALTER TABLE `assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender` enum('user','ai') NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,1,'user','what is database?','2026-07-06 05:05:13'),(2,1,'ai','I\'m sorry, I couldn\'t generate a response. Please make sure the AI service is running.','2026-07-06 05:05:16'),(3,1,'user','What is database?','2026-07-06 05:06:08'),(4,1,'ai','I\'m sorry, I couldn\'t generate a response. Please make sure the AI service is running.','2026-07-06 05:06:10'),(14,4,'user','what is data base','2026-07-11 07:42:45'),(15,5,'user','what is python','2026-07-11 07:47:44'),(16,6,'user','what is database','2026-07-11 09:16:11'),(17,6,'ai','A database is a system that stores information so it can be organized and found easily [database_topic_1]. Think of it like a digital cabinet where data is kept in a structured way, such as in tables with rows and columns. For example, a table of students can store names, phone numbers, and course details. The structure helps you save, search, and update data quickly without confusion.','2026-07-11 09:16:26'),(18,7,'user','what is python','2026-07-11 09:17:49'),(19,7,'ai','Python is a programming language that uses simple words and indentation to structure code, making it easy to read and write for beginners (source: programming_topic_1). It focuses on logic rather than complex symbols, so you can start coding quickly. For example, `print(\"Hello, world!\")` displays text on the screen. A common mistake is forgetting quotes around text, which causes an error. Python is great for learning basic programming concepts and writing simple programs.','2026-07-11 09:17:52');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_sessions`
--

DROP TABLE IF EXISTS `chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_sessions`
--

LOCK TABLES `chat_sessions` WRITE;
/*!40000 ALTER TABLE `chat_sessions` DISABLE KEYS */;
INSERT INTO `chat_sessions` VALUES (1,1,'what is database?','2026-07-06 05:05:13',0),(4,2,'what is data base','2026-07-11 07:42:45',0),(5,2,'what is python','2026-07-11 07:47:44',0),(6,2,'what is database','2026-07-11 09:16:11',0),(7,2,'what is python','2026-07-11 09:17:49',0);
/*!40000 ALTER TABLE `chat_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `file_size` int NOT NULL,
  `content` text,
  `chunk_count` int DEFAULT '0',
  `indexed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flashcards`
--

DROP TABLE IF EXISTS `flashcards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flashcards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_id` int DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `topic` varchar(100) DEFAULT NULL,
  `front_text` text NOT NULL,
  `back_text` text NOT NULL,
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `times_reviewed` int NOT NULL DEFAULT '0',
  `last_reviewed` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `flashcards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flashcards_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flashcards`
--

LOCK TABLES `flashcards` WRITE;
/*!40000 ALTER TABLE `flashcards` DISABLE KEYS */;
INSERT INTO `flashcards` VALUES (1,2,NULL,'Programming','python','What is Python\'s main way to structure code instead of using braces or keywords?','Python uses indentation to structure code blocks.','medium',2,'2026-07-11 07:45:35','2026-07-09 03:01:23'),(2,2,NULL,'Programming','python','Write a simple Python line that prints \'Hello, world!\' to the screen.','print(\"Hello, world!\")','medium',0,NULL,'2026-07-09 03:01:23'),(3,2,NULL,'Programming','python','What is a common mistake when using print() with text?','Leaving out quotes around the text, which causes Python to treat the words as variable names and fail.','medium',0,NULL,'2026-07-09 03:01:23'),(4,2,NULL,'Programming','python','What does a for loop do in Python?','A for loop repeats a block of instructions a specific number of times or over a sequence.','medium',0,NULL,'2026-07-09 03:01:23'),(5,2,NULL,'Programming','python','What is the correct syntax for an if statement that prints \'Pass\' when score is 50 or more?','if score >= 50:\n    print(\"Pass\")','medium',0,NULL,'2026-07-09 03:01:23');
/*!40000 ALTER TABLE `flashcards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_attempts`
--

DROP TABLE IF EXISTS `quiz_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `answers` json NOT NULL,
  `score` int NOT NULL DEFAULT '0',
  `total` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `completed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `quiz_id` (`quiz_id`),
  CONSTRAINT `quiz_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quiz_attempts_ibfk_2` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_attempts`
--

LOCK TABLES `quiz_attempts` WRITE;
/*!40000 ALTER TABLE `quiz_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quizzes`
--

DROP TABLE IF EXISTS `quizzes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quizzes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `topic` varchar(100) DEFAULT NULL,
  `question_count` int NOT NULL DEFAULT '5',
  `quiz_type` enum('mcq','short_answer','mixed') NOT NULL DEFAULT 'mcq',
  `questions` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `quizzes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quizzes`
--

LOCK TABLES `quizzes` WRITE;
/*!40000 ALTER TABLE `quizzes` DISABLE KEYS */;
INSERT INTO `quizzes` VALUES (2,2,'Database - sql','Database','sql',6,'short_answer','[{\"type\": \"short_answer\", \"question\": \"What common mistake should you avoid when working with \\\"Tables and Rows\\\"?\", \"explanation\": \"Repeating the same meaning in different columns, which makes the data hard to use.\", \"correct_answer\": \"Repeating the same meaning in different columns, which makes the data hard to use.\"}, {\"type\": \"short_answer\", \"question\": \"Why is \\\"Variables\\\" important for students learning Programming?\", \"explanation\": \"Understanding fundamentals builds stronger knowledge.\", \"correct_answer\": \"A variable is a label that stores a value, such as text or a number. It helps the program remember information and use it later in the code.\"}, {\"type\": \"short_answer\", \"question\": \"Explain the concept of \\\"SQL SELECT\\\" in your own words.\", \"explanation\": \"SELECT is a SQL command that retrieves data from a table. It lets the user choose which columns to view.\", \"correct_answer\": \"SELECT is a SQL command that retrieves data from a table. It lets the user choose which columns to view.\"}, {\"type\": \"short_answer\", \"question\": \"Give an example of how \\\"What is a Database?\\\" is used in practice.\", \"explanation\": \"Example: A table of students can store names, phone numbers, and course details in rows and columns.\", \"correct_answer\": \"A table of students can store names, phone numbers, and course details in rows and columns.\"}, {\"type\": \"short_answer\", \"question\": \"How does \\\"Primary Key\\\" relate to other concepts in Database?\", \"explanation\": \"Concepts in Database build on each other.\", \"correct_answer\": \"Primary Key connects to sql in Database.\"}, {\"type\": \"short_answer\", \"question\": \"Explain the concept of \\\"CRUD Operations\\\" in your own words.\", \"explanation\": \"CRUD stands for Create, Read, Update, and Delete. These are the four main actions used to manage data in a database.\", \"correct_answer\": \"CRUD stands for Create, Read, Update, and Delete. These are the four main actions used to manage data in a database.\"}]','2026-07-11 07:09:53');
/*!40000 ALTER TABLE `quizzes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reminders`
--

DROP TABLE IF EXISTS `reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reminders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `assignment_id` int DEFAULT NULL,
  `message` varchar(500) NOT NULL,
  `remind_at` datetime NOT NULL,
  `is_sent` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `assignment_id` (`assignment_id`),
  CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reminders_ibfk_2` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminders`
--

LOCK TABLES `reminders` WRITE;
/*!40000 ALTER TABLE `reminders` DISABLE KEYS */;
/*!40000 ALTER TABLE `reminders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `study_summaries`
--

DROP TABLE IF EXISTS `study_summaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_summaries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `summary_text` text NOT NULL,
  `key_points` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `study_summaries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `study_summaries_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `study_summaries`
--

LOCK TABLES `study_summaries` WRITE;
/*!40000 ALTER TABLE `study_summaries` DISABLE KEYS */;
/*!40000 ALTER TABLE `study_summaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','admin') NOT NULL DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'w','ibankingabc@gmail.com','$2b$10$fUmzEQATi3mGRbY///.fu.LS7qL32ppSMIm59tYNpI2MObkogy8EC','student','2026-06-18 18:32:58'),(2,'bob','bob1@gmail.com','$2b$10$JWtP65zRL5uDdD7GPEVpbOdgSZikNNP1E/eQe66ApP5c8G8/i9lP.','student','2026-07-08 02:25:17');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'c240_ai'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-11 17:37:14
